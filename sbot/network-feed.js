'use strict'
const pull = require('pull-stream')
const HLRU = require('hashlru')
const extend = require('xtend')
const Defer = require('pull-defer')
const pullResume = require('../lib/pull-resume')
const threadSummary = require('../lib/thread-summary')
const LookupRoots = require('../lib/lookup-roots')
const ResolveAbouts = require('../lib/resolve-abouts')
const UniqueRoots = require('../lib/unique-roots')
const getRoot = require('../lib/get-root')

exports.manifest = {
  latest: 'source',
  roots: 'source'
}

exports.init = function (ssb, config) {
  // cache mostly just to avoid reading the same roots over and over again
  // not really big enough for multiple refresh cycles
  var cache = HLRU(100)

  return {
    latest: function () {
      return pull(
        ssb.createFeedStream({ live: true, old: false }),
        pull.filter(bumpFilter),
        LookupRoots({ ssb, cache })
      )
    },
    roots: function ({ reverse, limit, resume }) {
      var stream = Defer.source()

      ssb.friends.hops((err, hops) => {
        if (err) return stream.abort(err)

        // use resume option if specified
        var opts = { reverse, old: true }
        if (resume) {
          opts[reverse ? 'lt' : 'gt'] = resume
        }

        stream.resolve(pullResume.source(ssb.createFeedStream(opts), {
          limit,
          getResume: (item) => {
            // WAITING FOR: https://github.com/ssbc/secure-scuttlebutt/pull/215
            // otherwise roots can potentially have unwanted items pinned to top of feed
            // if a message has a timestamp far in the future
            return item && (item.rts || (item.value && item.value.timestamp))
          },
          filterMap: pull(
            pull.filter(msg => {
              // hack around #215 (should just merge this, matt!)
              return msg.rts || msg.value.timestamp < Date.now()
            }),

            // BUMP FILTER
            pull.filter(bumpFilter),

            // LOOKUP AND ADD ROOTS
            LookupRoots({ ssb, cache }),

            // FILTER BLOCKED (don't bump if author blocked, don't include if root author blocked)
            pull.filter(item => {
              if (item.value && hops[item.value.author] < 0) return false
              if (item.root && item.root.value && hops[item.root.value.author] < 0) return false
              return true
            }),

            // DON'T REPEAT THE SAME THREAD
            UniqueRoots(),

            // MAP ROOT ITEMS
            pull.map(item => {
              var root = item.root || item
              return root
            }),

            // RESOLVE ROOTS WITH ABOUTS
            ResolveAbouts({ ssb }),

            // ADD THREAD SUMMARY
            pull.asyncMap((item, cb) => {
              threadSummary(item.key, {
                recentLimit: 3,
                readThread: ssb.patchwork.thread.read,
                bumpFilter,
                messageFilter: (msg) => !hops[msg.value.author] || hops[msg.value.author] >= 0 // don't include blocked messages
              }, (err, summary) => {
                if (err) return cb(err)
                cb(null, extend(item, summary))
              })
            })
          )
        }))
      })

      return stream
    }
  }
}

function isAttendee (msg) {
  var content = msg.value && msg.value.content
  return (content && content.type === 'about' && content.attendee && !content.attendee.remove)
}

function bumpFilter (msg) {
  if (isAttendee(msg)) {
    return 'attending'
  } else if (msg.value.content.type === 'post') {
    if (getRoot(msg)) {
      return 'reply'
    } else {
      return 'post'
    }
  } else if (msg.value.content.type === 'about') {
    return 'updated'
  }
}
