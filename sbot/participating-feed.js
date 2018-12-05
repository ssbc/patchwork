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
    latest: function ({ onlyStarted = false } = {}) {
      return pull(
        ssb.createFeedStream({ live: true, old: false }),
        pull.filter((msg) => {
          // only bump for self if this is original posting
          return !msg.value.author === ssb.id || !getRoot(msg)
        }),
        pull.filter(bumpFilter),
        LookupRoots({ ssb, cache }),

        pull.filter(msg => {
          if (!onlyStarted) return true
          var root = msg.root || msg
          return root.value && root.value.author === ssb.id
        }),

        pull.asyncMap((item, cb) => {
          if (onlyStarted) return cb(null, item)

          var root = item.root || item
          threadSummary(root.key, {
            recentLimit: 0,
            readThread: ssb.patchwork.thread.read,
            bumpFilter
          }, (err, summary) => {
            if (err) return cb(err)
            if (isParticipant(summary, ssb.id)) {
              cb(null, item)
            } else {
              cb()
            }
          })
        }),

        pull.filter()
      )
    },
    roots: function ({ reverse, limit, resume, onlyStarted = false }) {
      // use resume option if specified
      var opts = { reverse, old: true }
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

          pull.filter(msg => {
            if (!onlyStarted) return true
            var root = msg.root || msg
            return root.value && root.value.author === ssb.id
          }),

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
              pullFilter: FilterBlocked([item.value && item.value.author, ssb.id], { isBlocking: ssb.friends.isBlocking })
            }, (err, summary) => {
              if (err) return cb(err)
              cb(null, extend(item, summary))
            })
          }),

          // only threads that I've posted in
          pull.filter(msg => {
            if (onlyStarted) return true
            return isParticipant(msg, ssb.id)
          })
        )
      })
    }
  }
}

function isParticipant (msg, author) {
  if (msg.rootBump && msg.rootBump.author === author) return true
  if (msg.bumps && msg.bumps.some(bump => bump.author === author)) return true
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
