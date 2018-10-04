'use strict'
const pull = require('pull-stream')
const extend = require('xtend')
const Defer = require('pull-defer')
const pullResume = require('../lib/pull-resume')
const threadSummary = require('../lib/thread-summary')
const ResolveAbouts = require('../lib/resolve-abouts')
const Paramap = require('pull-paramap')

exports.manifest = {
  roots: 'source'
}

exports.init = function (ssb, config) {
  return {
    roots: function ({reverse, limit, resume}) {
      var stream = Defer.source()

      ssb.friends.hops((err, hops) => {
        if (err) return stream.abort(err)

        // use resume option if specified
        var opts = {reverse, old: true, type: 'gathering'}
        if (resume) {
          opts[reverse ? 'lt' : 'gt'] = resume
        }

        stream.resolve(pullResume.source(ssb.messagesByType(opts), {
          limit,
          getResume: (item) => {
            return item.timestamp
          },
          filterMap: pull(
            // don't include if author blocked
            pull.filter(item => {
              if (item.value && hops[item.value.author] < 0) return false
              return true
            }),

            // RESOLVE ROOTS WITH ABOUTS
            ResolveAbouts({ssb}),

            // FILTER GATHERINGS BASED ON ATTENDEES AND AUTHOR (and hide if no title)
            pull.filter(msg => {
              if (!msg.gathering.title) return
              return isFollowing(msg.value.author) || msg.gathering.attending.some(isFollowing)
            }),

            // ADD THREAD SUMMARY
            Paramap((item, cb) => {
              threadSummary(item.key, {
                recentLimit: 3,
                readThread: ssb.patchwork.thread.read,
                bumpFilter,
                messageFilter: (msg) => !hops[msg.value.author] || hops[msg.value.author] >= 0 // don't include blocked messages
              }, (err, summary) => {
                if (err) return cb(err)
                cb(null, extend(item, summary, {
                  rootBump: bumpFilter(item)
                }))
              })
            }, 10)
          )
        }))

        function bumpFilter (msg) {
          if (msg.value.content.type === 'about' && msg.value.content.attendee && !msg.value.content.attendee.remove) {
            return {type: 'attending'}
          }
        }

        function isFollowing (id) {
          return hops[id] === 0 || hops[id] === 1
        }
      })

      return stream
    }
  }
}
