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
              timestamp: resume ? {$lt: resume, $gt: 0} : {$gt: 0}
            }}
          ]
        } else {
          opts.query = [
            {$filter: {
              timestamp: resume ? {$gt: resume} : {$gt: 0}
            }}
          ]
        }

        stream.resolve(pullResume.source(ssb.private.read(opts), {
          private: true,
          limit,
          getResume: (item) => {
            return item.timestamp
          },
          filterMap: pull(
            // LOOKUP AND ADD ROOTS
            LookupRoots({ssb, cache}),

            // ONLY POSTS BUMP PRIVATE (currently)
            pull.filter(item => {
              return item.value.content.type === 'post'
            }),

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
            pull.asyncMap((item, cb) => {
              threadSummary(item.key, {
                recentLimit: 3,
                readThread: ssb.patchwork.thread.read,
                bumpFilter,
                messageFilter: (msg) => !hops[msg.value.author] || hops[msg.value.author] >= 0 // don't include blocked messages
              }, (err, summary) => {
                if (err) return cb(err)
                cb(null, extend(item, summary, {
                  filterResult: undefined,
                  rootBump: bumpFilter(item)
                }))
              })
            })
          )
        }))

        function bumpFilter (msg) {
          if (msg.value.content.type === 'post') {
            return {type: 'reply'}
          }
        }
      })

      return stream
    }
  }
}
