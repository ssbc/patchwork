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

tape('inbox index counts correctly track read/unread', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: { follows: ['bob'] },
    bob: {},
    charlie: {}
  }, function (err, users) {
    if (err) throw err

    var done = multicb()
    users.bob.add({ type: 'post', text: 'hello from bob', mentions: [users.alice.id] }, done())
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

tape('vote index includes upvotes on the users posts', function (t) {
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
      users.bob.add({ type: 'vote', vote: { link: msg.key, value: 1 } }, done())
      users.charlie.add({ type: 'vote', vote: { link: msg.key, value: 1 } }, done())
      done(function (err) {
        if (err) throw err

        pull(sbot.patchwork.createVoteStream(), pull.collect(function (err, msgs) {
          if (err) throw err
          t.equal(msgs.length, 2)
          t.end()
          sbot.close()
        }))
      })
    })
  })
})

tape('vote index does not include downvotes, and removes unvotes', function (t) {
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
      users.bob.add({ type: 'vote', vote: { link: msg.key, value: -1 } }, done())
      users.charlie.add({ type: 'vote', vote: { link: msg.key, value: 1 } }, done())
      users.charlie.add({ type: 'vote', vote: { link: msg.key, value: 0 } }, done())
      done(function (err) {
        if (err) throw err

        pull(sbot.patchwork.createVoteStream(), pull.collect(function (err, msgs) {
          if (err) throw err
          t.equal(msgs.length, 0)
          t.end()
          sbot.close()
        }))
      })
    })
  })
})

tape('vote index counts correctly track read/unread', function (t) {
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
      users.bob.add({ type: 'vote', vote: { link: msg.key, value: 1 } }, done())
      users.charlie.add({ type: 'vote', vote: { link: msg.key, value: 1 } }, done())
      done(function (err, msgs) {
        if (err) throw err
        var voteMsg = msgs[0][1]

        sbot.patchwork.getIndexCounts(function (err, counts) {
          if (err) throw err
          t.equal(counts.votes, 2)
          t.equal(counts.votesUnread, 2)

          sbot.patchwork.markRead(voteMsg.key, function (err) {
            if (err) throw err

            sbot.patchwork.getIndexCounts(function (err, counts) {
              if (err) throw err
              t.equal(counts.votes, 2)
              t.equal(counts.votesUnread, 1)

              sbot.patchwork.markUnread(voteMsg.key, function (err) {
                if (err) throw err

                sbot.patchwork.getIndexCounts(function (err, counts) {
                  if (err) throw err
                  t.equal(counts.votes, 2)
                  t.equal(counts.votesUnread, 2)
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
})

tape('follow index includes all new followers', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: { follows: ['alice'] },
    charlie: { follows: ['alice'] }
  }, function (err, users) {
    if (err) throw err

    pull(sbot.patchwork.createFollowStream(), pull.collect(function (err, msgs) {
      if (err) throw err
      t.equal(msgs.length, 2)
      t.end()
      sbot.close()
    }))
  })
})

tape('follow index includes unfollows', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: { follows: ['alice'] },
    charlie: { follows: ['alice'] }
  }, function (err, users) {
    if (err) throw err

    users.charlie.add({ type: 'contact', contact: users.alice.id, following: false }, function (err) {
      if (err) throw err
      pull(sbot.patchwork.createFollowStream(), pull.collect(function (err, msgs) {
        if (err) throw err
        t.equal(msgs.length, 3)
        t.end()
        sbot.close()
      }))
    })
  })
})

tape('follow index counts correctly track read/unread', function (t) {
  var sbot = u.newserver()
  u.makeusers(sbot, {
    alice: {},
    bob: { follows: ['alice'] },
    charlie: { follows: ['alice'] }
  }, function (err, users, msgs) {
    if (err) throw err
    var followMsg = msgs[1][1]

    sbot.patchwork.getIndexCounts(function (err, counts) {
      if (err) throw err
      t.equal(counts.follows, 2)
      t.equal(counts.followsUnread, 2)

      sbot.patchwork.markRead(followMsg.key, function (err) {
        if (err) throw err

        sbot.patchwork.getIndexCounts(function (err, counts) {
          if (err) throw err
          t.equal(counts.follows, 2)
          t.equal(counts.followsUnread, 1)

          sbot.patchwork.markUnread(followMsg.key, function (err) {
            if (err) throw err

            sbot.patchwork.getIndexCounts(function (err, counts) {
              if (err) throw err
              t.equal(counts.follows, 2)
              t.equal(counts.followsUnread, 2)

              t.end()
              sbot.close()
            })
          })
        })
      })
    })
  })
})

