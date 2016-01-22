var mlib = require('ssb-msgs')
var multicb = require('multicb')
var EventEmitter = require('events').EventEmitter
var threadlib = require('patchwork-threads')

// constant used to decide if an index-entry was recent enough to emit an 'add' event for
var IS_RECENT_MAX = 1e3 * 60 * 60 * 48 // 2 days

module.exports.index = function (name) {
  var index = new EventEmitter()
  index.name = name
  index.rows = []
  index.lastAccessed = Date.now()

  index.touch = function () {
    index.lastAccessed = Date.now()
  }

  index.sortedInsert = function (ts, key) {
    var row = (typeof ts == 'object') ? ts : { ts: ts, key: key }
    for (var i=0; i < index.rows.length; i++) {
      if (index.rows[i].ts < row.ts) {
        index.rows.splice(i, 0, row)
        if (timestampIsRecent(row.ts))
          index.emit('add', row)
        return row
      }
    }
    index.rows.push(row)
    if (timestampIsRecent(row.ts))
      index.emit('add', row)
    return row
  }

  index.sortedUpsert = function (ts, key) {
    var i = index.indexOf(key)
    if (i !== -1) {
      // readd to index at new TS
      if (index.rows[i].ts < ts) {
        var row = index.rows[i]
        // remove from old position
        index.rows.splice(i, 1)
        // update values
        row.ts = ts
        // reinsert
        index.sortedInsert(row)
        return row
      } else
        return index.rows[i]
    } else {
      // add to index
      return index.sortedInsert(ts, key)
    }
  }

  index.remove = function (key, keyname) {
    var i = index.indexOf(key, keyname)
    if (i !== -1)
      index.rows.splice(i, 1)
  }

  index.indexOf = function (key, keyname) {
    keyname = keyname || 'key'
    for (var i=0; i < index.rows.length; i++) {
      if (index.rows[i][keyname] === key)
        return i
    }
    return -1
  }

  index.find = function (key, keyname) {
    var i = index.indexOf(key, keyname)
    if (i !== -1)
      return index.rows[i]
    return null
  }

  index.contains = function (key) {
    return index.indexOf(index, key) !== -1
  }

  index.filter = index.rows.filter.bind(index.rows)

  // helper to count # of messages that are new
  index.countUntouched = function () {
    // iterate until we find a ts older than lastAccessed, then return that #
    for (var i=0; i < index.rows.length; i++) {
      if (index.rows[i].ts < index.lastAccessed)
        return i
    }
    return 0
  }

  function timestampIsRecent (ts) {
    var now = Date.now()
    var delta = Math.abs(now - ts)
    return (delta < IS_RECENT_MAX)
  }

  return index
}

module.exports.getThreadHasUnread = function (sbot, msg, cb) {
  threadlib.getParentPostSummary(sbot, msg, { isRead: true }, function (err, thread) {
    if (err) return cb(err)
    cb(err, thread.hasUnread)
  })
}