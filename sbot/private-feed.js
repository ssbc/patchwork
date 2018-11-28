'use strict'
const pull = require('pull-stream')
const HLRU = require('hashlru')
const extend = require('xtend')
const pullResume = require('../lib/pull-resume')
const threadSummary = require('../lib/thread-summary')
const LookupRoots = require('../lib/lookup-roots')
const ResolveAbouts = require('../lib/resolve-abouts')
const UniqueRoots = require('../lib/unique-roots')
const Paramap = require('pull-paramap')
const FilterBlocked = require('../lib/filter-blocked')

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
        ssb.private.read({
          live: true,
          old: false
        }),
        pull.filter(bumpFilter),
        LookupRoots({ ssb, cache })
        // TODO: don't bump if author blocked
      )
    },
    roots: function ({ reverse, limit, resume }) {
      // use resume option if specified
      var opts = { reverse, old: true }

      if (reverse) {
        opts.query = [
          { $filter: {
            timestamp: resume ? { $lt: resume, $gt: 0 } : { $gt: 0 }
          } }
        ]
      } else {
        opts.query = [
          { $filter: {
            timestamp: resume ? { $gt: resume } : { $gt: 0 }
          } }
        ]
      }

      return pullResume.source(ssb.private.read(opts), {
        private: true,
        limit,
        getResume: (item) => {
          return item.timestamp
        },
        filterMap: pull(
          // LOOKUP AND ADD ROOTS
          LookupRoots({ ssb, cache }),

          // ONLY POSTS BUMP PRIVATE (currently)
          pull.filter(bumpFilter),

          FilterBlocked([ssb.id], {
            isBlocking: ssb.friends.isBlocking,
            useRootAuthorBlocks: false, // disabled in private mode
            checkRoot: true
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
          Paramap((item, cb) => {
            threadSummary(item.key, {
              recentLimit: 3,
              readThread: ssb.patchwork.thread.read,
              bumpFilter,
              pullFilter: FilterBlocked([ssb.id], { isBlocking: ssb.friends.isBlocking })
            }, (err, summary) => {
              if (err) return cb(err)
              cb(null, extend(item, summary, {
                filterResult: undefined,
                rootBump: bumpFilter(item)
              }))
            })
          }, 20)
        )
      })
    }
  }
}

function bumpFilter (msg) {
  if (msg.value.content.type === 'post') {
    return { type: 'reply' }
  }
}
