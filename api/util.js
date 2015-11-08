var mlib = require('ssb-msgs')
var multicb = require('multicb')
var EventEmitter = require('events').EventEmitter

module.exports.index = function () {
  var index = new EventEmitter()
  index.rows = []

  index.sortedInsert = function (ts, key) {
    var row = (typeof ts == 'object') ? ts : { ts: ts, key: key }
    for (var i=0; i < index.rows.length; i++) {
      if (index.rows[i].ts < row.ts) {
        index.rows.splice(i, 0, row)
        index.emit('add', row)
        return row
      }
    }
    index.rows.push(row)
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

  return index
}

module.exports.getRootMsg = function (sbot, msg, cb) {
  var mid
  if (typeof msg === 'string')
    mid = msg
  else {
    var link = mlib.link(msg.value.content.root || msg.value.content.branch, 'msg')
    if (!link)
      return cb(null, msg) // already at root
    mid = link.link
  }
  up()
  function up () {
    sbot.get(mid, function (err, msgvalue) {
      if (err)
        return cb(err)

      // not found? stop here
      if (!msgvalue)
        return cb()

      // ascend
      var link = mlib.link(msgvalue.content.root || msgvalue.content.branch, 'msg')
      if (link) {
        mid = link.link
        return up()
      }

      // topmost, finish
      cb(null, { key: mid, value: msgvalue })
    })
  }
}

module.exports.getPostThread = function (sbot, msg, cb) {
  // get thread
  sbot.relatedMessages({ id: typeof msg === 'string' ? msg : msg.key, count: true }, function (err, thread) {
    if (err) return cb(err)
    // decrypt as needed
    module.exports.decryptThread(sbot, thread, function (err) {
      if (err) return cb(err)
      cb(null, thread)
    })
  })
}

module.exports.iterateThreadAsync = function (thread, maxDepth, fn, cb) {
  var done = multicb()
  fn(thread, done()) // run on toplevel
  if (thread.related)
    iterate(thread.related, 1)
  done(cb)

  function iterate (msgs, n) {
    if (!isNaN(maxDepth) && n > maxDepth)
      return
    // run through related
    msgs.forEach(function (msg) {
      fn(msg, done()) // run on item
      if (msg.related)
        iterate(msg.related, n+1)
    })
  }
}

module.exports.decryptThread = function (sbot, thread, cb) {
  exports.iterateThreadAsync(thread, 1, function (msg, cb2) {
    if ('plaintext' in msg)
      return cb2() // already handled

    msg.plaintext = (typeof msg.value.content != 'string')
    if (msg.plaintext)
      return cb2() // not encrypted

    // decrypt
    var decrypted = sbot.private.unbox(msg.value.content)
    if (decrypted)
      msg.value.content = decrypted
    cb2()
  }, cb)
}

module.exports.getThreadHasUnread = function (sbot, msg, cb) {
  module.exports.getRootMsg(sbot, msg, function (err, rootMsg) {
    if (err) return cb(err)
    module.exports.getPostThread(sbot, rootMsg, function (err, thread) {
      if (err) return cb(err)

      var hasUnread = false
      module.exports.iterateThreadAsync(thread, 1, function (msg, cb2) {
        if ('isRead' in msg)
          return cb2() // already handled
        if (msg.value.content.type != 'post')
          return cb2() // not a post

        msg.isRead = false
        sbot.patchwork.isRead(msg.key, function (err, isRead) {
          msg.isRead = isRead
          hasUnread = hasUnread || !isRead
          cb2()
        })
      }, function (err) {
        cb(err, hasUnread)
      })
    })
  })
}