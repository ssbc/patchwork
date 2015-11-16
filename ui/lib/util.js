var pull = require('pull-stream')
var ip = require('ip')
var mlib = require('ssb-msgs')
var mime = require('mime-types')
var multicb = require('multicb')
var app = require('./app')
var social = require('./social-graph')

exports.debounce = function (fn, wait) {
  var timeout
  return function() {
    clearTimeout(timeout)
    timeout = setTimeout(fn, wait)
  }
}

exports.shortString = function(str, len) {
  len = len || 6
  if (str.length - 3 > len)
    return str.slice(0, len) + '...'
  return str
}

var dataSizes = ['kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb']
exports.bytesHuman = function (nBytes) {
  var str = nBytes + 'b'
  for (var i = 0, nApprox = nBytes / 1024; nApprox > 1; nApprox /= 1024, i++) {
    str = nApprox.toFixed(2) + dataSizes[i]
  }
  return str
}

exports.getName = function (id) {
  return app.users.names[id] || exports.shortString(id, 6)
}

exports.profilePicUrl = function (id) {
  var url = './img/default-prof-pic.png'
  var profile = app.users.profiles[id]
  if (profile) {
    var link

    // lookup the image link
    if (profile.self.image)
      link = profile.self.image

    if (link) {
      url = 'http://localhost:7777/'+link.link

      // append the 'backup img' flag, so we always have an image
      url += '?fallback=img'

      // if we know the filetype, try to construct a good filename
      if (link.type) {
        var ext = link.type.split('/')[1]
        if (ext) {
          var name = app.users.names[id] || 'profile'
          url += '&name='+encodeURIComponent(name+'.'+ext)
        }
      }
    }
  }
  return url
}

exports.getParentPostThread = function (mid, cb) {
  up()
  function up () {
    app.ssb.get(mid, function (err, msg) {
      if (err)
        return cb(err)

      // not found? finish here
      if (!msg)
        return finish()

      // decrypt as needed
      msg.plaintext = (typeof msg.content != 'string')
      if (msg.plaintext) return next()
      app.ssb.private.unbox(msg.content, function (err, decrypted) {
        if (decrypted)
          msg.content = decrypted
        next()
      })
      function next () {

        // root link? go straight to that
        if (mlib.link(msg.content.root, 'msg')) {
          mid = mlib.link(msg.content.root).link
          return finish()
        }

        // branch link? ascend
        if (mlib.link(msg.content.branch, 'msg')) {
          mid = mlib.link(msg.content.branch).link
          return up()
        }

        // topmost, finish
        finish()

      }
    })
  }
  function finish () {
    exports.getPostThread(mid, cb)
  }
}

exports.getPostThread = function (mid, cb) {
  // get message and full tree of backlinks
  app.ssb.relatedMessages({ id: mid, count: true }, function (err, thread) {
    if (err) return cb(err)
    exports.fetchThreadData(thread, cb)
  })
}

exports.getPostSummary = function (mid, cb) {
  // get message and immediate backlinks
  var done = multicb({ pluck: 1, spread: true })
  app.ssb.get(mid, done())
  pull(app.ssb.links({ dest: mid, keys: true, values: true }), pull.collect(done()))
  done((err, value, related) => {
    if (err) return cb(err)
    var thread = { key: mid, value: value, related: related }
    exports.fetchThreadData(thread, cb)
  })
}

exports.fetchThreadData = function (thread, cb) {
  // decrypt as needed
  exports.decryptThread(thread, function (err) {
    if (err) return cb(err)
    var done = multicb()
    // fetch isread state for posts (only 1 level deep, dont need to recurse)
    exports.attachThreadIsread(thread, 1, done())
    // fetch bookmark state
    exports.attachThreadIsbookmarked(thread, 1, done())
    // look for user mention (same story on recursion)
    thread.mentionsUser = false
    exports.iterateThreadAsync(thread, 1, function (msg, cb2) {
      var c = msg.value.content
      if (c.type !== 'post' || !c.mentions) return cb2()
      mlib.links(c.mentions, 'feed').forEach(function (l) {
        if (l.link === app.user.id)
          thread.mentionsUser = true
      })
      cb2()
    }, done())
    // compile votes
    exports.compileThreadVotes(thread)
    done(function (err) {
      if (err) return cb(err)
      cb(null, thread)
    })
  })
}

exports.iterateThread = function (thread, maxDepth, fn) {
  fn(thread)
  if (thread.related)
    iterate(thread.related, 1)

  function iterate (msgs, n) {
    if (!isNaN(maxDepth) && n > maxDepth)
      return
    // run through related
    msgs.forEach(function (msg) {
      fn(msg) // run on item
      if (msg.related)
        iterate(msg.related, n+1)
    })
  }
}

exports.iterateThreadAsync = function (thread, maxDepth, fn, cb) {
  var done = multicb()
  fn(thread, done()) // run on toplevel
  if (thread.related)
    iterate(thread.related, 1)
  done(err => cb(err, thread))

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

exports.attachThreadIsread = function (thread, maxdepth, cb) {
  thread.hasUnread = false
  exports.iterateThreadAsync(thread, maxdepth, function (msg, cb2) {
    if ('isRead' in msg)
      return cb2() // already handled
    if (msg.value.content.type != 'post')
      return cb2() // not a post

    msg.isRead = false
    app.ssb.patchwork.isRead(msg.key, function (err, isRead) {
      msg.isRead = isRead
      thread.hasUnread = thread.hasUnread || !isRead
      cb2()
    })
  }, cb)
}

exports.attachThreadIsbookmarked = function (thread, maxdepth, cb) {
  exports.iterateThreadAsync(thread, maxdepth, function (msg, cb2) {
    if ('isBookmarked' in msg)
      return cb2() // already handled
    if (msg.value.content.type != 'post')
      return cb2() // not a post

    msg.isBookmarked = false
    app.ssb.patchwork.isBookmarked(msg.key, function (err, isBookmarked) {
      msg.isBookmarked = isBookmarked
      cb2()
    })
  }, cb)
}

exports.compileThreadVotes = function (thread) {
  compileMsgVotes(thread)
  if (thread.related)
    thread.related.forEach(compileMsgVotes)

  function compileMsgVotes (msg) {
    msg.votes = {}
    if (!msg.related || !msg.related.length)
      return

    msg.related.forEach(function (r) {
      var c = r.value.content
      if (c.type === 'vote' && c.vote && 'value' in c.vote)
        msg.votes[r.value.author] = c.vote.value
    })
  }
}

exports.markThreadRead = function (thread, cb) {
  // is any message in the thread unread?
  if (!thread.hasUnread)
    return cb() // no need
  // iterate only 1 level deep, dont need to recurse
  exports.iterateThreadAsync(thread, 1, function (msg, cb2) {
    if (msg == thread) {
      // always mark the root read, to update the API's isread index
    } else {
      // is this message already read?
      if (msg.isRead)
        return cb2() // skip
    }
    if (msg.value.content.type != 'post')
      return cb2() // not a post

    app.ssb.patchwork.markRead(msg.key, function (err, isRead) {
      msg.isRead = true
      cb2()
    })
  }, function () {
    thread.hasUnread = false
    cb()
  })
}

exports.decryptThread = function (thread, cb) {
  exports.iterateThreadAsync(thread, undefined, function (msg, cb2) {
    if ('plaintext' in msg)
      return cb2() // already handled

    msg.plaintext = (typeof msg.value.content != 'string')
    if (msg.plaintext)
      return cb2() // not encrypted

    // decrypt
    app.ssb.private.unbox(msg.value.content, function (err, decrypted) {
      if (decrypted)
        msg.value.content = decrypted
      cb2()
    })
  }, cb)
}

exports.getLastThreadPost = function (thread) {
  var msg = thread
  if (!thread.related)
    return msg
  thread.related.forEach(function (r) {
    if (r.value.content.type === 'post')
      msg = r
  })
  return msg
}

exports.getPubStats = function (peers) {
  var membersof=0, membersofActive=0, membersofUntried=0, connected=0
  ;(peers||app.peers).forEach(function (peer) {
    // filter out LAN peers
    if (peer.host == 'localhost' || ip.isPrivate(peer.host))
      return
    var connectSuccess = (peer.time && peer.time.connect && (peer.time.connect > peer.time.attempt) || peer.connected)
    if (connectSuccess)
      connected++
    if (social.follows(peer.key, app.user.id)) {
      membersof++
      if (connectSuccess)
        membersofActive++
      if (!peer.time || !peer.time.attempt)
        membersofUntried++
    }
  })
  
  return {
    membersof: membersof,
    membersofActive: membersofActive,
    membersofUntried: membersofUntried,
    connected: connected,
    hasSyncIssue: (!membersof || (!membersofUntried && !membersofActive))
  }
}