var multicb = require('multicb')
var tape    = require('tape')
var ssbkeys = require('ssb-keys')
var pull    = require('pull-stream')
var u       = require('./util')

tape('newsfeed index includes all public posts', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    users.alice.add({ type: 'post', text: 'hello from alice' }, function (err, msg) { // included
      if (err) throw err

      var done = multicb()
      users.bob.add({ type: 'post', text: 'hello from bob' }, done()) // included
      users.bob.add(ssbkeys.box({ type: 'post', text: 'secret hello from bob', recps: [users.alice.id, users.bob.id] }, [users.alice.keys, users.bob.keys]), done()) // not included
      users.charlie.add({ type: 'post', text: 'reply from charlie', root: msg.key, branch: msg.key }, done()) // not included
      done(function (err) {
        if (err) throw err

        pull(sbot.patchwork.createNewsfeedStream(), pull.collect(function (err, msgs) {
          if (err) throw err
          t.equal(msgs.length, 2)
          t.end()
          sbot.close()
        }))
      })
    })
  })
})

tape('newsfeed index updates the root message for replies', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    users.alice.add({ type: 'post', text: 'hello from alice' }, function (err, msg1) {
      if (err) throw err

      users.bob.add({ type: 'post', text: 'hello from bob' }, function (err, msg2) {
        if (err) throw err

        pull(sbot.patchwork.createNewsfeedStream(), pull.collect(function (err, msgs) {
          if (err) throw err
          t.equal(msgs.length, 2)
          t.equal(msgs[0].key, msg2.key)
          t.equal(msgs[1].key, msg1.key)

          users.charlie.add({ type: 'post', text: 'reply from charlie', root: msg1.key, branch: msg1.key }, function (err) {
            if (err) throw err

            pull(sbot.patchwork.createNewsfeedStream(), pull.collect(function (err, msgs) {
              if (err) throw err
              t.equal(msgs.length, 2)
              t.equal(msgs[0].key, msg1.key) // order of msgs was reversed
              t.equal(msgs[1].key, msg2.key)
              t.end()
              sbot.close()
            }))
          })
        }))
      })
    })
  })
})

tape('newsfeed index includes encrypted messages', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob'] }, // Note, does not follow charlie
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    var done = multicb()
    users.bob.add(ssbkeys.box({ type: 'post', text: 'hello from bob' }, [users.alice.keys, users.bob.keys]), done())
    users.charlie.add(ssbkeys.box({ type: 'post', text: 'hello from charlie' }, [users.alice.keys, users.charlie.keys]), done())
    done(function (err) {
      if (err) throw err

      pull(sbot.patchwork.createNewsfeedStream(), pull.collect(function (err, msgs) {
        if (err) throw err
        t.equal(msgs.length, 2)
        t.equal(msgs[0].value.author, users.charlie.id)
        t.equal(msgs[1].value.author, users.bob.id)
        t.end()
        sbot.close()
      }))
    })
  })
})

tape('newsfeed index includes follows and votes on local user', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob', 'charlie'] }, // neither follow is included
    bob: { follows: ['alice'] }, // included
    charlie: { follows: ['alice'] } // included
  }, function (err, users) {
    if (err) throw err

    pull(sbot.patchwork.createNewsfeedStream(), pull.collect(function (err, msgs) {
        if (err) throw err
        t.equal(msgs.length, 2) // 2 follows

      var done = multicb({ pluck: 1, spread: true })
      users.alice.add({ type: 'post', text: 'hello from alice' }, done()) // included
      users.bob.add({ type: 'post', text: 'hello from bob' }, done()) // included
      done(function (err, alicePost, bobPost) {
        if (err) throw err

        var done = multicb({ pluck: 1, spread: true })
        users.bob.add({ type: 'vote', vote: { link: alicePost.key, value: 1 } }, done()) // included
        users.charlie.add({ type: 'vote', vote: { link: alicePost.key, value: -1 } }, done()) // included
        users.bob.add({ type: 'vote', vote: { link: bobPost.key, value: 1 } }, done()) // not included
        users.charlie.add({ type: 'vote', vote: { link: bobPost.key, value: -1 } }, done()) // not included
        done(function (err) {
          if (err) throw err

          pull(sbot.patchwork.createNewsfeedStream(), pull.collect(function (err, msgs) {
            if (err) throw err
            t.equal(msgs.length, 6)
            t.end()
            sbot.close()
          }))
        })
      })
    }))
  })
})

tape('inbox index doesnt include public threads', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    users.alice.add({ type: 'post', text: 'hello from alice' }, function (err, msg) {
      if (err) throw err

      var done = multicb()
      users.bob.add({ type: 'post', text: 'hello from bob' }, done())
      users.charlie.add({ type: 'post', text: 'hello from charlie', root: msg.key, branch: msg.key }, done())
      done(function (err) {
        if (err) throw err

        pull(sbot.patchwork.createInboxStream(), pull.collect(function (err, msgs) {
          if (err) throw err
          t.equal(msgs.length, 0)
          t.end()
          sbot.close()
        }))
      })
    })
  })
})

tape('inbox index includes messages which include local user as a recipient or mentioned', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    var done = multicb()
    users.alice.add({ type: 'post', text: 'hello from alice' }, done()) // not included
    users.alice.add({ type: 'post', text: 'hello from alice', recps: [users.alice.id, users.bob.id] }, done()) // included
    users.alice.add({ type: 'post', text: 'hello from alice', mentions: [users.alice.id, users.bob.id] }, done()) // included
    users.alice.add({ type: 'post', text: 'hello from alice', recps: [users.bob.id] }, done()) // not included
    users.alice.add({ type: 'post', text: 'hello from alice', mentions: [users.bob.id] }, done()) // not included
    users.bob.add({ type: 'post', text: 'hello from bob' }, done()) // not included
    users.bob.add({ type: 'post', text: 'hello from bob', recps: [users.alice.id, users.bob.id] }, done()) // included
    users.bob.add({ type: 'post', text: 'hello from bob', mentions: [users.alice.id, users.bob.id] }, done()) // included
    users.bob.add({ type: 'post', text: 'hello from bob', recps: [users.bob.id] }, done()) // not included
    users.bob.add({ type: 'post', text: 'hello from bob', mentions: [users.bob.id] }, done()) // not included
    done(function (err) {
      if (err) throw err

      pull(sbot.patchwork.createInboxStream(), pull.collect(function (err, msgs1) {
        if (err) throw err
        t.equal(msgs1.length, 4)
        t.end()      
        sbot.close()
      }))
    })
  })
})

tape('inbox index updates the root message for replies', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    users.alice.add({ type: 'post', text: 'hello from alice', recps: [users.alice.id, users.bob.id] }, function (err, msg) {
      if (err) throw err

      pull(sbot.patchwork.createInboxStream(), pull.collect(function (err, msgs1) {
        if (err) throw err
        t.equal(msgs1.length, 1)

        users.bob.add({ type: 'post', text: 'hello from bob', root: msg.key, branch: msg.key }, function (err) {
          if (err) throw err

          pull(sbot.patchwork.createInboxStream(), pull.collect(function (err, msgs2) {
            if (err) throw err
            t.equal(msgs2.length, 1)
            t.equal(msgs2[0].value.author, users.alice.id)
            t.ok(msgs2[0].ts > msgs1[0].ts) // timestamp was updated by the reply
            t.end()
            sbot.close()
          }))
        })
      }))
    })
  })
})

tape('inbox index counts tracks read/unread', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    var done = multicb()
    users.bob.add({ type: 'post', text: 'hello from bob', recps: [users.alice.id, users.bob.id] }, done())
    done(function (err, msgs) {
      if (err) throw err
      var inboxedMsg = msgs[0][1]

      sbot.patchwork.getIndexCounts(function (err, counts) {
        if (err) throw err
        t.equal(counts.inbox, 1)
        t.equal(counts.inboxUnread, 1)

        sbot.patchwork.markRead(inboxedMsg.key, function (err) {
          if (err) throw err

          sbot.patchwork.getIndexCounts(function (err, counts) {
            if (err) throw err
            t.equal(counts.inbox, 1)
            t.equal(counts.inboxUnread, 0)

            sbot.patchwork.markUnread(inboxedMsg.key, function (err) {
              if (err) throw err

              sbot.patchwork.getIndexCounts(function (err, counts) {
                if (err) throw err
                t.equal(counts.inbox, 1)
                t.equal(counts.inboxUnread, 1)

                t.end()
                sbot.close()
              })
            })
          })
        })
      })
    })
  })
})

tape('inbox index counts track read/unread of replies on the root', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    addRoot()

    function addRoot () {
      // check that the root msgs' read/unread state is properly tracked
      users.bob.add({ type: 'post', text: 'hello from bob', recps: [users.alice.id, users.bob.id] }, function (err, root) {
        if (err) throw err

        sbot.patchwork.getIndexCounts(function (err, counts) {
          if (err) throw err
          t.equal(counts.inbox, 1)
          t.equal(counts.inboxUnread, 1)

          sbot.patchwork.markRead(root.key, function (err) {
            if (err) throw err

            sbot.patchwork.getIndexCounts(function (err, counts) {
              if (err) throw err
              t.equal(counts.inbox, 1)
              t.equal(counts.inboxUnread, 0)

              addFirstReply(root)
            })
          })
        })
      })
    }
    function addFirstReply (root) {
      // check that the first reply's read/unread state is properply merged with root
      users.alice.add({ type: 'post', text: 'hello from alice', root: root.key, branch: root.key }, function (err, reply1) {
        if (err) throw err

        sbot.patchwork.getIndexCounts(function (err, counts) {
          if (err) throw err
          t.equal(counts.inbox, 1)
          t.equal(counts.inboxUnread, 1)

          sbot.patchwork.markRead([root.key, reply1.key], function (err) {
            if (err) throw err

            sbot.patchwork.getIndexCounts(function (err, counts) {
              if (err) throw err
              t.equal(counts.inbox, 1)
              t.equal(counts.inboxUnread, 0)

              addSecondReply(root, reply1)
            })
          })
        })
      })
    }
    function addSecondReply (root, reply1) {
      // check that the second reply's read/unread state is properply merged with root
      users.bob.add({ type: 'post', text: 'hello again from bob', root: root.key, branch: reply1.key }, function (err, reply2) {
        if (err) throw err

        sbot.patchwork.getIndexCounts(function (err, counts) {
          if (err) throw err
          t.equal(counts.inbox, 1)
          t.equal(counts.inboxUnread, 1)

          sbot.patchwork.markRead([root.key, reply2.key], function (err) {
            if (err) throw err

            sbot.patchwork.getIndexCounts(function (err, counts) {
              if (err) throw err
              t.equal(counts.inbox, 1)
              t.equal(counts.inboxUnread, 0)

              t.end()
              sbot.close()
            })
          })
        })
      })
    }
  })      
})

tape('bookmark index includes only bookmarked posts', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob', 'charlie'] },
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    var done = multicb({ pluck: 1, spread: true })
    users.alice.add({ type: 'post', text: 'hello from alice' }, done())
    users.bob.add({ type: 'post', text: 'hello from bob' }, done())
    users.charlie.add({ type: 'post', text: 'hello from charlie' }, done())
    done(function (err, msg1, msg2, msg3) {
      if (err) throw err

      var done = multicb()
      sbot.patchwork.bookmark(msg1.key, done())
      sbot.patchwork.toggleBookmark(msg3.key, done())
      done(function (err) {
        if (err) throw err

        pull(sbot.patchwork.createBookmarkStream(), pull.collect(function (err, msgs) {
          if (err) throw err
          t.equal(msgs.length, 2)
          t.equal(msgs[0].key, msg3.key)
          t.equal(msgs[1].key, msg1.key)

          var done = multicb()
          sbot.patchwork.unbookmark(msg1.key, done())
          sbot.patchwork.toggleBookmark(msg2.key, done())
          sbot.patchwork.toggleBookmark(msg3.key, done())
          done(function (err) {
            if (err) throw err

            pull(sbot.patchwork.createBookmarkStream(), pull.collect(function (err, msgs) {
              if (err) throw err
              t.equal(msgs.length, 1)
              t.equal(msgs[0].key, msg2.key)
              t.end()
              sbot.close()
            }))
          })
        }))
      })
    })
  })
})

tape('bookmark index orders by most recent reply', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    var done = multicb({ pluck: 1, spread: true })
    users.alice.add({ type: 'post', text: 'hello from alice' }, done())
    users.bob.add({ type: 'post', text: 'hello from bob' }, done())
    done(function (err, msg1, msg2) {
      if (err) throw err

      var done = multicb()
      sbot.patchwork.bookmark(msg1.key, done())
      sbot.patchwork.bookmark(msg2.key, done())
      done(function (err) {
        if (err) throw err

        pull(sbot.patchwork.createBookmarkStream(), pull.collect(function (err, msgs) {
          if (err) throw err
          t.equal(msgs.length, 2)
          t.equal(msgs[0].key, msg2.key)
          t.equal(msgs[1].key, msg1.key)

          users.alice.add({ type: 'post', text: 'reply from alice', root: msg1.key, branch: msg1.key }, function (err) {
            if (err) throw err

            pull(sbot.patchwork.createBookmarkStream(), pull.collect(function (err, msgs) {
              if (err) throw err
              t.equal(msgs.length, 2)
              // note, they are now swapped:
              t.equal(msgs[0].key, msg1.key)
              t.equal(msgs[1].key, msg2.key)
              t.end()
              sbot.close()
            }))
          })
        }))
      })
    })
  })
})

tape('notifications index includes votes on the users posts', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    users.alice.add({ type: 'post', text: 'hello from alice' }, function (err, msg) {
      if (err) throw err

      var done = multicb()
      users.bob.add({ type: 'vote', vote: { link: msg.key, value: 1 } }, done())
      users.charlie.add({ type: 'vote', vote: { link: msg.key, value: -1 } }, done())
      done(function (err) {
        if (err) throw err

        pull(sbot.patchwork.createNotificationsStream(), pull.collect(function (err, msgs) {
          if (err) throw err
          t.equal(msgs.length, 2)
          t.end()
          sbot.close()
        }))
      })
    })
  })
})

tape('notifications index includes follows, unfollows, blocks, and unblocks', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    var done = multicb()
    users.bob.add({ type: 'contact', contact: users.alice.id, following: true }, done())
    users.charlie.add({ type: 'contact', contact: users.alice.id, blocking: true }, done())
    done(function (err) {
      if (err) throw err

      pull(sbot.patchwork.createNotificationsStream(), pull.collect(function (err, msgs) {
        if (err) throw err
        t.equal(msgs.length, 2)

        var done = multicb()
        users.bob.add({ type: 'contact', contact: users.alice.id, following: false }, done())
        users.charlie.add({ type: 'contact', contact: users.alice.id, blocking: false }, done())
        done(function (err) {
          if (err) throw err

          pull(sbot.patchwork.createNotificationsStream(), pull.collect(function (err, msgs) {
            if (err) throw err
            t.equal(msgs.length, 4)
            t.end()
            sbot.close()
          }))
        })
      }))
    })
  })
})
