'use strict'
var pull = require('pull-stream')
var FlumeViewLevel = require('flumeview-level')
var pullCat = require('pull-cat')
var HLRU = require('hashlru')
var extend = require('xtend')
var normalizeChannel = require('../lib/normalize-channel')

// HACK: pull it out of patchcore
var getRoot = require('patchcore/message/sync/root').create().message.sync.root

module.exports = function (ssb, config) {
  var create = FlumeViewLevel(1, function (msg, seq) {
    var result = [
      [msg.value.timestamp, getRoot(msg) || msg.key]
    ]
    return result
  })

  var index = ssb._flumeUse('patchwork-roots', create)

  // cache mostly just to avoid reading the same roots over and over again
  // not really big enough for multiple refresh cycles
  var cache = HLRU(100)

  return {
    latest: function ({ids = [ssb.id]}) {
      var filter = null
      return pull(
        // READ INDEX
        index.read({old: false}),

        // LOAD FILTERS
        pull.asyncMap((item, cb) => {
          if (!filter) {
            // pause stream until filters have loaded
            getFilter((err, result) => {
              if (err) return cb(err)
              filter = result
              cb(null, item)
            })
          } else {
            cb(null, item)
          }
        }),

        // BUMP FILTER
        pull.filter(item => {
          if (filter && item.value && item.value) {
            return filter(ids, item.value)
          }
        }),

        // LOOKUP ROOTS
        pull.asyncMap((item, cb) => {
          var msg = item.value
          var key = item.key[1]
          if (key === msg.key) {
            // already a root
            cb(null, msg)
          }
          getThruCache(key, (_, value) => {
            cb(null, extend(msg, {
              root: value
            }))
          })
        }),

        // FILTER
        pull.filter(item => {
          var root = item.root || item
          if (filter && root && root.value && !getRoot(root)) {
            return filter(ids, root)
          }
        })
      )
    },
    read: function ({ids = [ssb.id], reverse, live, old, limit, lt, gt}) {
      var opts = {reverse, live, old}

      // handle markers passed in to lt / gt
      if (lt && typeof lt.timestamp === 'number') lt = lt.timestamp
      if (gt && typeof gt.timestamp === 'number') gt = gt.timestamp
      if (typeof lt === 'number') opts.lt = [lt]
      if (typeof gt === 'number') opts.gt = [gt]

      var seen = new Set()
      var marker = {marker: true, timestamp: null}
      var filter = null

      var stream = pull(

        // READ ROOTS
        index.read(opts),

        // LOAD FILTERS
        pull.asyncMap((item, cb) => {
          if (!filter) {
            // pause stream until filters have loaded
            getFilter((err, result) => {
              if (err) return cb(err)
              filter = result
              cb(null, item)
            })
          } else {
            cb(null, item)
          }
        }),

        // BUMP FILTER
        pull.filter(item => {
          if (filter && item.value && item.value.value) {
            return filter(ids, item.value)
          }
        }),

        // MAP ROOTS
        pull.map(item => {
          if (item.sync) return item
          marker.timestamp = item.key[0]
          return item.key[1]
        }),

        // UNIQUE
        pull.filter(item => {
          if (old === false) return true // don't filter live stream
          if (item && item.sync) {
            return true
          } else if (typeof item === 'string') {
            if (!seen.has(item)) {
              seen.add(item)
              return true
            }
          }
        }),

        // LOOKUP (with cache)
        pull.asyncMap((item, cb) => {
          if (item.sync) return cb(null, item)
          var key = item
          getThruCache(key, cb)
        }),

        // ROOT FILTER
        pull.filter(msg => {
          if (filter && msg.value && !getRoot(msg)) {
            return filter(ids, msg)
          }
        })
      )

      // TRUNCATE
      if (typeof limit === 'number') {
        var count = 0
        return pullCat([
          pull(
            stream,
            pull.take(limit),
            pull.through(() => {
              count += 1
            })
          ),

          // send truncated marker for resuming search
          pull(
            pull.values([marker]),
            pull.filter(() => count === limit)
          )
        ])
      } else {
        return stream
      }
    }
  }

  function getThruCache (key, cb) {
    if (cache.has(key)) {
      cb(null, cache.get(key))
    } else {
      ssb.get(key, (_, value) => {
        var msg = {key, value}
        if (msg.value) {
          cache.set(key, msg)
        }
        cb(null, msg)
      })
    }
  }

  function getFilter (cb) {
    // TODO: rewrite contacts stream
    ssb.contacts.get((err, contacts) => {
      if (err) return cb(err)
      ssb.patchwork.getSubscriptions((err, subscriptions) => {
        if (err) return cb(err)
        cb(null, function (ids, msg) {
          var type = msg.value.content.type
          if (type === 'vote') return false // filter out likes
          var matchesChannel = (type !== 'channel' && checkChannel(subscriptions, ids, msg.value.content.channel))
          return ids.includes(msg.value.author) || matchesChannel || checkFollowing(contacts, ids, msg.value.author)
        })
      })
    })
  }
}

function checkFollowing (lookup, ids, target) {
  // TODO: rewrite contacts index (for some reason the order is different)
  var value = mostRecentValue(ids.map(id => lookup[id].following && lookup[id].following[target]), 1)
  return value && value[0]
}

function checkChannel (lookup, ids, channel) {
  channel = normalizeChannel(channel)
  if (channel) {
    var value = mostRecentValue(ids.map(id => lookup[`${id}:${channel}`]))
    return value && value[1]
  }
}

function mostRecentValue (values, timestampIndex = 0) {
  var mostRecent = null
  values.forEach(value => {
    if (value && (!mostRecent || mostRecent[timestampIndex] < value[timestampIndex])) {
      mostRecent = value
    }
  })
  return mostRecent
}
