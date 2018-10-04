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
const Paramap = require('pull-paramap')

exports.manifest = {
  roots: 'source'
}

exports.init = function (ssb, config) {
  // cache mostly just to avoid reading the same roots over and over again
  // not really big enough for multiple refresh cycles
  var cache = HLRU(100)

  return {
    roots: function ({reverse, limit, resume}) {
      var stream = Defer.source()

      ssb.friends.hops((err, hops) => {
        if (err) return stream.abort(err)

        // use resume option if specified
        var opts = {reverse, old: true}

        if (reverse) {
          opts.query = [
            {$filter: {
              dest: ssb.id,
              timestamp: resume ? {$lt: resume, $gt: 0} : {$gt: 0}
            }}
          ]
        } else {
          opts.query = [
            {$filter: {
              dest: ssb.id,
              timestamp: resume ? {$gt: resume} : {$gt: 0}
            }}
          ]
        }

        stream.resolve(pullResume.source(ssb.backlinks.read(opts), {
          limit,
          getResume: (item) => {
            return item.timestamp
          },
          filterMap: pull(
            // CHECK IF IS MENTION
            pull.filter(bumpFilter),

            // LOOKUP AND ADD ROOTS
            LookupRoots({ssb, cache}),

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
            ResolveAbouts({ssb}),

            // ADD THREAD SUMMARY
            Paramap((item, cb) => {
              threadSummary(item.key, {
                recentLimit: 3,
                readThread: ssb.patchwork.thread.read,
                bumpFilter,
                recentFilter: bumpFilter,
                messageFilter: (msg) => !hops[msg.value.author] || hops[msg.value.author] >= 0 // don't include blocked messages
              }, (err, summary) => {
                if (err) return cb(err)
                cb(null, extend(item, summary, {
                  filterResult: undefined,
                  rootBump: bumpFilter(item)
                }))
              })
            }, 10)
          )
        }))

        function bumpFilter (msg) {
          if (msg.value.author !== ssb.id) {
            if (Array.isArray(msg.value.content.mentions) && msg.value.content.mentions.some(mention => {
              return mention && mention.link === ssb.id
            })) {
              return {type: 'mention'}
            } else if (msg.value.content.type === 'contact' && msg.value.content.following === true) {
              return {type: 'follow'}
            }
          }
        }
      })

      return stream
    }
  }
}
