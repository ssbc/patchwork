'use strict'
const pull = require('pull-stream')
const pullCont = require('pull-cont')
const extend = require('xtend')
const threadSummary = require('../../../lib/thread-summary')
const ResolveAbouts = require('../../../lib/resolve-abouts')
const Paramap = require('pull-paramap')
const FilterBlocked = require('../../../lib/filter-blocked')
const async = require('async')
const nest = require('depnest')

exports.needs = nest({
  'sqldb.async.messagesByType': 'first',
  'sqldb.async.isBlocking': 'first',
  'sqldb.async.isFollowing': 'first',
  'sqldb.async.threadRead': 'first',
  'about.async.latestValues': 'first',
  'about.async.socialValues': 'first',
  'keys.sync.id': 'first'
})

exports.gives = nest({
  'sqldb.async.gatherings.roots': true
})

exports.create = function (api) {
  return nest({
    'sqldb.async.gatherings.latest': function () {
      return pull(
        pullCont((cb) => api.sqldb.async.messagesByType({ type: 'gathering', live: true, old: false }, cb)), // TODO bad continuable
        ResolveAbouts({ socialValues: api.about.async.socialValues, latestValues: api.about.async.latestValues }),
        ApplyFilterResult({ getPubKey: api.keys.sync.id, isFollowing: api.sqldb.async.isFollowing }),
        pull.filter(msg => !!msg.filterResult)
      )
    },
    'sqldb.async.gatherings.roots': function ({ reverse, limit, lastSeq }, cb) {
      // use resume option if specified

      function readThread (opts) {
        return pullCont(function (cb) {
          api.sqldb.async.threadRead(opts, function (err, result) {
            if (err) return cb(err)
            cb(null, pull.values(result))
          })
        })
      }

      return pull(
        pullCont((cb) => api.sqldb.async.messagesByType({ type: 'gathering', reverse: true, lastSeq }, function (err, results) {
          if (err) return cb(err)
          cb(null, pull.values(results))
        })),

        // don't include if author blocked
        // FilterBlocked([api.keys.sync.id()], {
        //  isBlocking: api.sqldb.async.isBlocking
        // }),

        // RESOLVE ROOTS WITH ABOUTS
        ResolveAbouts({ socialValues: api.about.async.socialValues, latestValues: api.about.async.latestValues }),

        // FILTER GATHERINGS BASED ON ATTENDEES AND AUTHOR (and hide if no title)
        // ApplyFilterResult({ getPubKey: api.keys.sync.id, isFollowing: api.sqldb.async.isFollowing }),
        // pull.filter(msg => !!msg.filterResult),

        // ADD THREAD SUMMARY
        Paramap((item, cb) => {
          threadSummary(item.key, {
            recentLimit: 3,
            readThread,
            bumpFilter,
            pullFilter: pull(
            //  FilterBlocked([item.value && item.value.author, api.keys.sync.id()], { isBlocking: api.sqldb.async.isBlocking }),
              ApplyReplyFilterResult({ getPubKey: api.keys.sync.id, isFollowing: api.sqldb.async.isFollowing })
            )
          }, (err, summary) => {
            if (err) return cb(err)
            cb(null, extend(item, summary, {
              rootBump: bumpFilter(item)
            }))
          })
        }, 10),
        pull.collect(cb)
      )
    }
  })
}

function bumpFilter (msg) {
  if (msg.value.content.type === 'about' && msg.filterResult && msg.value.content.attendee && !msg.value.content.attendee.remove) {
    return { type: 'attending' }
  }
}

function ApplyFilterResult ({ getPubKey, isFollowing }) {
  return pull.asyncMap((msg, cb) => {
    isFollowing({ source: getPubKey(), dest: msg.value.author }, (err, followingAuthor) => {
      if (err) return cb(err)
      async.filterSeries(msg.gathering && (msg.gathering.attending || []), (dest, cb) => {
        isFollowing({ source: getPubKey(), dest }, cb)
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

function ApplyReplyFilterResult ({ getPubKey, isFollowing }) {
  return pull.asyncMap((msg, cb) => {
    isFollowing({ source: getPubKey(), dest: msg.value.author }, (err, isFollowing) => {
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
