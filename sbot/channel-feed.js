'use strict'
const pull = require('pull-stream')
const HLRU = require('hashlru')
const extend = require('xtend')
const pullResume = require('../lib/pull-resume')
const threadSummary = require('../lib/thread-summary')
const LookupRoots = require('../lib/lookup-roots')
const ResolveAbouts = require('../lib/resolve-abouts')
const UniqueRoots = require('../lib/unique-roots')
const getRoot = require('../lib/get-root')
const normalizeChannel = require('ssb-ref').normalizeChannel
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
    latest: function ({ channel }) {
      channel = normalizeChannel(channel)
      var query = [{ $filter: {
        dest: `#${channel}`
      } }]
      return pull(
        ssb.backlinks.read({ old: false, live: true, query, awaitReady: false }),
        pull.filter(msg => checkBump(msg, { channel })),
        LookupRoots({ ssb, cache })
        // TODO: don't bump if author blocked
      )
    },
    roots: function ({ reverse, limit, resume, channel }) {
      channel = normalizeChannel(channel)

      // use resume option if specified
      var rts = { $gt: 0 }
      if (resume) {
        rts = reverse ? { $lt: resume } : { $gt: resume }
      }

      var opts = {
        reverse,
        awaitReady: false,
        old: true,
        query: [{ $filter: {
          dest: `#${channel}`,
          rts
        } }]
      }

      return pullResume.source(ssb.backlinks.read(opts), {
        limit,
        getResume: (item) => {
          return item.rts
        },
        filterMap: pull(
          // CHECK IF SHOULD BE INCLUDED
          pull.filter(bumpFilter),

          // LOOKUP AND ADD ROOTS
          LookupRoots({ ssb, cache }),

          // FILTER BLOCKED (don't bump if author blocked, don't include if root author blocked)
          FilterBlocked([ssb.id], {
            isBlocking: ssb.friends.isBlocking,
            useRootAuthorBlocks: true,
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
          pull.asyncMap((item, cb) => {
            threadSummary(item.key, {
              recentLimit: 3,
              readThread: ssb.patchwork.thread.read,
              bumpFilter,
              recentFilter: bumpFilter,
              pullFilter: FilterBlocked([item.value && item.value.author, ssb.id], { isBlocking: ssb.friends.isBlocking })
            }, (err, summary) => {
              if (err) return cb(err)
              cb(null, extend(item, summary, {
                rootBump: bumpFilter(item)
              }))
            })
          })
        )
      })

      function bumpFilter (msg) {
        return checkBump(msg, { channel })
      }
    }
  }
}

function checkBump (msg, { channel }) {
  if (!msg.value) return
  if (msg.value.content.type === 'vote') return
  if (normalizeChannel(msg.value.content.channel) === channel) {
    if (getRoot(msg)) {
      return 'reply'
    } else {
      return 'post'
    }
  }

  if (Array.isArray(msg.value.content.mentions)) {
    if (msg.value.content.mentions.some(mention => {
      if (mention && typeof mention.link === 'string' && mention.link.startsWith('#')) {
        return normalizeChannel(mention.link) === channel
      }
    })) {
      return 'channel-mention'
    }
  }
}
