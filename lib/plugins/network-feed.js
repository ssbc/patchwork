'use strict'
const pull = require('pull-stream')
const HLRU = require('hashlru')
const extend = require('xtend')
const pullResume = require('../pull-resume')
const threadSummary = require('../thread-summary')
const LookupRoots = require('../lookup-roots')
const ResolveAbouts = require('../resolve-abouts')
const UniqueRoots = require('../unique-roots')
const getRoot = require('../get-root')
const FilterBlocked = require('../filter-blocked')

exports.manifest = {
  latest: 'source',
  roots: 'source'
}

exports.init = function (ssb) {
  // cache mostly just to avoid reading the same roots over and over again
  // not really big enough for multiple refresh cycles
  const cache = HLRU(100)

  return {
    latest: function () {
      return pull(
        ssb.createFeedStream({ live: true, old: false }),
        pull.filter(bumpFilter),
        LookupRoots({ ssb, cache })
      )
    },
    roots: function ({ reverse, limit, resume }) {
      // use resume option if specified
      const opts = { reverse, old: true }
      if (resume) {
        opts[reverse ? 'lt' : 'gt'] = resume
      }

      return pullResume.source(ssb.createFeedStream(opts), {
        limit,
        getResume: (item) => {
          return item && item.rts
        },
        filterMap: pull(
          // BUMP FILTER
          pull.filter(bumpFilter),

          // LOOKUP AND ADD ROOTS
          LookupRoots({ ssb, cache }),

          // FILTER BLOCKED (don't bump if author blocked, don't include if root author blocked)
          FilterBlocked([ssb.id], {
            isBlocking: ssb.patchwork.contacts.isBlocking,
            useRootAuthorBlocks: true,
            checkRoot: true
          }),

          // DON'T REPEAT THE SAME THREAD
          UniqueRoots(),

          // MAP ROOT ITEMS
          pull.map(item => {
            const root = item.root || item
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
              pullFilter: FilterBlocked([item.value && item.value.author, ssb.id], { isBlocking: ssb.patchwork.contacts.isBlocking })
            }, (err, summary) => {
              if (err) return cb(err)
              cb(null, extend(item, summary))
            })
          })
        )
      })
    }
  }
}

function isAttendee (msg) {
  const content = msg.value && msg.value.content
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
