'use strict'
const pull = require('pull-stream')
const extend = require('xtend')
const pullResume = require('../lib/pull-resume')
const threadSummary = require('../lib/thread-summary')
const ResolveAbouts = require('../lib/resolve-abouts')
const Paramap = require('pull-paramap')
const FilterBlocked = require('../lib/filter-blocked')
const async = require('async')

exports.manifest = {
  latest: 'source',
  roots: 'source'
}

exports.init = function (ssb, config) {
  return {
    latest: function () {
      return pull(
        ssb.messagesByType({ type: 'gathering', live: true, old: false }),
        ResolveAbouts({ ssb }),
        ApplyFilterResult({ ssb }),
        pull.filter(msg => !!msg.filterResult)
      )
    },
    roots: function ({ reverse, limit, resume }) {
      // use resume option if specified
      var opts = { reverse, old: true, type: 'gathering', private: true }
      if (resume) {
        opts[reverse ? 'lt' : 'gt'] = resume
      }

      return pullResume.source(ssb.messagesByType(opts), {
        limit,
        getResume: (item) => {
          return item.timestamp
        },
        filterMap: pull(
          // don't include if author blocked
          FilterBlocked([ssb.id], {
            isBlocking: ssb.friends.isBlocking
          }),

          // RESOLVE ROOTS WITH ABOUTS
          ResolveAbouts({ ssb }),

          // FILTER GATHERINGS BASED ON ATTENDEES AND AUTHOR (and hide if no title)
          ApplyFilterResult({ ssb }),
          pull.filter(msg => !!msg.filterResult),

          // ADD THREAD SUMMARY
          Paramap((item, cb) => {
            threadSummary(item.key, {
              recentLimit: 3,
              readThread: ssb.patchwork.thread.read,
              bumpFilter,
              pullFilter: pull(
                FilterBlocked([item.value && item.value.author, ssb.id], { isBlocking: ssb.friends.isBlocking }),
                ApplyReplyFilterResult({ ssb })
              )
            }, (err, summary) => {
              if (err) return cb(err)
              cb(null, extend(item, summary, {
                rootBump: bumpFilter(item)
              }))
            })
          }, 10)
        )
      })
    }
  }
}

function bumpFilter (msg) {
  if (msg.value.content.type === 'about' && msg.filterResult && msg.value.content.attendee && !msg.value.content.attendee.remove) {
    return { type: 'attending' }
  }
}

function ApplyFilterResult ({ ssb }) {
  return pull.asyncMap((msg, cb) => {
    ssb.friends.isFollowing({ source: ssb.id, dest: msg.value.author }, (err, followingAuthor) => {
      if (err) return cb(err)
      async.filterSeries(msg.gathering && (msg.gathering.attending || []), (dest, cb) => {
        ssb.friends.isFollowing({ source: ssb.id, dest }, cb)
      }, (err, followingAttending) => {
        if (err) return cb(err)
        var hasTitle = !!msg.gathering.title
        if ((followingAttending.length || followingAuthor) && hasTitle) {
          msg.filterResult = {
            followingAttending,
            followingAuthor,
            hasTitle
          }
        }
        cb(null, msg)
      })
    })
  })
}

function ApplyReplyFilterResult ({ ssb }) {
  return pull.asyncMap((msg, cb) => {
    ssb.friends.isFollowing({ source: ssb.id, dest: msg.value.author }, (err, isFollowing) => {
      if (err) return cb(err)
      if (isFollowing) {
        msg.filterResult = {
          isFollowing
        }
      }
      cb(null, msg)
    })
  })
}
