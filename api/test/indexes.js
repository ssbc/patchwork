var multicb = require('multicb')
var tape    = require('tape')
var ssbkeys = require('ssb-keys')
var pull    = require('pull-stream')
var u       = require('./util')

tape('inbox index includes all posts', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob'] }, // Note, does not follow charlie
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
          t.equal(msgs.length, 2)
          t.end()
          sbot.close()
        }))
      })
    })
  })
})

tape('inbox index updates the root message for replies', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob'] }, // Note, does not follow charlie
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    users.alice.add({ type: 'post', text: 'hello from alice' }, function (err, msg) {
      if (err) throw err

      var done = multicb()
      users.bob.add({ type: 'post', text: 'hello from bob', root: msg.key, branch: msg.key }, done())
      done(function (err) {
        if (err) throw err

        pull(sbot.patchwork.createInboxStream(), pull.collect(function (err, msgs) {
          if (err) throw err
          t.equal(msgs.length, 1)
          t.equal(msgs[0].value.author, users.alice.id)
          t.end()
          sbot.close()
        }))
      })
    })
  })
})

tape('inbox index includes non-posts with post replies on them', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob'] }, // Note, does not follow charlie
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    users.alice.add({ type: 'nonpost', text: 'hello from alice' }, function (err, msg) {
      if (err) throw err

      pull(sbot.patchwork.createInboxStream(), pull.collect(function (err, msgs) {
        if (err) throw err
        t.equal(msgs.length, 0)

        var done = multicb()
        users.charlie.add({ type: 'post', text: 'hello from charlie', root: msg.key, branch: msg.key }, done())
        done(function (err) {
          if (err) throw err

          pull(sbot.patchwork.createInboxStream(), pull.collect(function (err, msgs) {
            if (err) throw err
            t.equal(msgs.length, 1)
            t.equal(msgs[0].value.author, users.alice.id)
            t.end()
            sbot.close()
          }))
        })
      }))
    })
  })
})

tape('inbox index includes encrypted messages', function (t) {
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

      pull(sbot.patchwork.createInboxStream(), pull.collect(function (err, msgs) {
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

tape('inbox index counts tracks read/unread', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    var done = multicb()
    users.bob.add({ type: 'post', text: 'hello from bob' }, done())
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
    alice: { follows: ['bob'] },
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    addRoot()

    function addRoot () {
      // check that the root msgs' read/unread state is properly tracked
      users.bob.add({ type: 'post', text: 'hello from bob' }, function (err, root) {
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
      users.charlie.add({ type: 'post', text: 'hello from charlie', root: root.key, branch: root.key }, function (err, reply1) {
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
      users.charlie.add({ type: 'post', text: 'hello from charlie', root: root.key, branch: reply1.key }, function (err, reply2) {
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
