var fs          = require('fs')
var pull        = require('pull-stream')
var multicb     = require('multicb')
var pl          = require('pull-level')
var pushable    = require('pull-pushable')
var paramap     = require('pull-paramap')
var cat         = require('pull-cat')
var Notify      = require('pull-notify')
var toPull      = require('stream-to-pull-stream')
var ref         = require('ssb-ref')
var pathlib     = require('path')
var u           = require('./util')

exports.name        = 'patchwork'
exports.version     = '1.0.0'
exports.manifest    = require('./manifest')
exports.permissions = require('./permissions')

exports.init = function (sbot, opts) {

  var api = {}
  var phoenixdb = sbot.sublevel('patchwork')
  var db = {
    isread: phoenixdb.sublevel('isread'),
    bookmarked: phoenixdb.sublevel('bookmarked')
  }
  var state = {
    // indexes (lists of {key:, ts:})
    mymsgs: [],
    inbox: u.index(), // also has `.isread` and `.author`
    bookmarks: u.index(), // also has `.isread`
    notifications: u.index(),

    // views
    profiles: {},
    names: {}, // ids -> names
    ids: {}, // names -> ids
    actionItems: {}
  }

  // track sync state
  // - processor does async processing for each message that comes in
  // - awaitSync() waits for that processing to finish
  // - pinc() on message arrival, pdec() on message processed
  // - nP === 0 => all messages processed
  var nP = 0, syncCbs = []
  function awaitSync (cb) {
    if (nP > 0)
      syncCbs.push(cb)
    else cb()
  }
  state.pinc = function () { nP++ }
  state.pdec = function () {
    nP--
    if (nP === 0) {
      syncCbs.forEach(function (cb) { cb() })
      syncCbs.length = 0
    }
  }

  // load bookmarks into an index
  state.pinc()
  pull(
    pl.read(db.bookmarked, { keys: true, values: false }),
    pull.asyncMap(function (key, cb) {
      sbot.get(key, function (err, value) {
        if (value) cb(null, { key: key, value: value })
        else cb()
      })
    }),
    pull.drain(
      function (msg) {
        if (msg)
          state.bookmarks.sortedUpsert(msg.value.timestamp, msg.key)
      },
      function () { state.pdec() }
    )
  )

  // setup sbot log processor
  var processor = require('./processor')(sbot, db, state, emit)
  pull(pl.read(sbot.sublevel('log'), { live: true, onSync: onPrehistorySync }), pull.drain(processor))

  var isPreHistorySynced = false // track so we dont emit events for old messages
  // grab for history sync
  state.pinc()
  function onPrehistorySync () {
    console.log('Log history read...')
    // when all current items finish, consider prehistory synced (and start emitting)
    awaitSync(function () { 
      console.log('Indexes generated')
      isPreHistorySynced = true
    })
    // release
    state.pdec()
  }

  // events stream
  var notify = Notify()
  function emit (type, data) {
    if (!isPreHistorySynced)
      return
    var e = data || {}
    e.type = type
    if (e.type == 'index-change') {
      api.getIndexCounts(function (err, counts) {
        e.counts = counts
        e.total = counts[e.index]
        e.unread = counts[e.index+'Unread']
        notify(e)
      })
    } else
      notify(e)
  }

  // getters

  api.createEventStream = function () {
    return notify.listen()
  }

  api.getMyProfile = function (cb) {
    awaitSync(function () {
      api.getProfile(sbot.id, cb)
    })
  }

  api.getIndexCounts = function (cb) {
    awaitSync(function () {
      cb(null, {
        inbox: state.inbox.rows.length,
        inboxUnread: state.inbox.filter(function (row) { return !row.isread }).length
      })
    })
  }

  api.createInboxStream = indexStreamFn(state.inbox, function (row) { 
    return row.key
  })
  api.createBookmarkStream = indexStreamFn(state.bookmarks, function (row) { 
    return row.key
  })
  api.createNotificationsStream = indexStreamFn(state.notifications, function (row) { 
    return row.key
  })

  function indexMarkRead (indexname, key, keyname) {
    if (Array.isArray(key)) {
      key.forEach(function (k) {
        indexMarkRead(indexname, k, keyname)
      })
      return
    }

    var index = state[indexname]
    var row = index.find(key, keyname)
    if (row) {
      var wasread = row.isread
      row.isread = true
      if (!wasread)
        emit('index-change', { index: indexname })
    }
  }

  function indexMarkUnread (indexname, key, keyname) {
    if (Array.isArray(key)) {
      key.forEach(function (k) {
        indexMarkUnread(indexname, k, keyname)
      })
      return
    }

    var index = state[indexname]
    var row = index.find(key, keyname)
    if (row) {
      var wasread = row.isread
      row.isread = false
      if (wasread)
        emit('index-change', { index: indexname })
    }
  }

  api.markRead = function (key, cb) {
    indexMarkRead('inbox', key)
    indexMarkRead('bookmarks', key)
    if (Array.isArray(key))
      db.isread.batch(key.map(function (k) { return { type: 'put', key: k, value: 1 }}), cb)
    else
      db.isread.put(key, 1, cb)
  }
  api.markUnread = function (key, cb) {
    indexMarkUnread('inbox', key)
    indexMarkUnread('bookmarks', key)
    if (Array.isArray(key))
      db.isread.batch(key.map(function (k) { return { type: 'del', key: k }}), cb)
    else
      db.isread.del(key, cb) 
  }
  api.toggleRead = function (key, cb) {
    api.isRead(key, function (err, v) {
      if (!v) {
        api.markRead(key, function (err) {
          cb(err, true)
        })
      } else {
        api.markUnread(key, function (err) {
          cb(err, false)
        })
      }
    })
  }
  api.isRead = function (key, cb) {
    if (Array.isArray(key)) {
      var done = multicb({ pluck: 1 })
      key.forEach(function (k, i) {
        var cb = done()
        db.isread.get(k, function (err, v) { cb(null, !!v) })
      })
      done(cb)
    } else {
      db.isread.get(key, function (err, v) {
        cb && cb(null, !!v)
      })
    }
  }
 
  api.bookmark = function (key, cb) {
    sbot.get(key, function (err, value) {
      if (err) return cb(err)
      state.bookmarks.sortedUpsert(value.timestamp, key)
      db.bookmarked.put(key, 1, cb)
    })
  }
  api.unbookmark = function (key, cb) {
    sbot.get(key, function (err, value) {
      if (err) return cb(err)
      state.bookmarks.remove(key)
      db.bookmarked.del(key, cb) 
    })
  }
  api.toggleBookmark = function (key, cb) {
    api.isBookmarked(key, function (err, v) {
      if (!v) {
        api.bookmark(key, function (err) {
          cb(err, true)
        })
      } else {
        api.unbookmark(key, function (err) {
          cb(err, false)
        })
      }
    })
  }
  api.isBookmarked = function (key, cb) {
    db.bookmarked.get(key, function (err, v) {
      cb && cb(null, !!v)
    })
  }

  api.addFileToBlobs = function (path, cb) {
    pull(
      toPull.source(fs.createReadStream(path)),
      sbot.blobs.add(function (err, hash) {
        if (err)
          cb(err)
        else {
          var ext = pathlib.extname(path)
          if (ext == '.png' || ext == '.jpg' || ext == '.jpeg') {
            var res = getImgDim(path)
            res.hash = hash
            cb(null, res)
          } else
            cb(null, { hash: hash })
        }
      })
    )
  }
  api.saveBlobToFile = function (hash, path, cb) {
    pull(
      sbot.blobs.get(hash),
      toPull.sink(fs.createWriteStream(path), cb)
    )
  }
  function getImgDim (path) {
    var NativeImage = require('native-image')
    var ni = NativeImage.createFromPath(path)
    return ni.getSize()
  }

  var lookupcodeRegex = /(@[a-z0-9\/\+\=]+\.[a-z0-9]+)(?:\[via\])?(.+)?/i
  api.useLookupCode = function (code) {
    var eventPush = pushable()

    // parse and validate the code
    var id, addrs
    var parts = lookupcodeRegex.exec(code)
    var valid = true
    if (parts) {
      id  = parts[1]
      addrs = (parts[2]) ? parts[2].split(',') : []

      // validate id
      if (!ref.isFeedId(id))
        valid = false

      // parse addresses
      addrs = addrs
        .map(function (addr) {
          addr = addr.split(':')
          if (addr.length === 3)
            return { host: addr[0], port: +addr[1], key: addr[2] }
        })
        .filter(Boolean)
    } else
      valid = false

    if (!valid) {
      eventPush.push({ type: 'error', message: 'Invalid lookup code' })
      eventPush.end()
      return eventPush
    }

    // begin the search!
    search(addrs.concat(sbot.gossip.peers()))
    function search (peers) {
      var peer = peers.pop()
      if (!peer)
        return eventPush.end()

      // connect to the peer
      eventPush.push({ type: 'connecting', addr: peer })      
      sbot.connect(peer, function (err, rpc) {
        if (err) {
          eventPush.push({ type: 'error', message: 'Failed to connect', err: err })
          return search(peers)
        }
        // try a sync
        sync(rpc, function (err, seq) { 
          if (seq > 0) {
            // success!
            eventPush.push({ type: 'finished', seq: seq })
            eventPush.end()
          } else
            search(peers) // try next
        })
      })
    }

    function sync (rpc, cb) {
      // fetch the feed
      var seq
      eventPush.push({ type: 'syncing', id: id })
      pull(
        rpc.createHistoryStream({ id: id, keys: false }),
        pull.through(function (msg) {
          seq = msg.sequence
        }),
        sbot.createWriteStream(function (err) {
          cb(err, seq)
        })
      )
    }

    return eventPush
  }

  api.getProfile = function (id, cb) {
    awaitSync(function () { cb(null, state.profiles[id]) })
  }
  api.getAllProfiles = function (cb) {
    awaitSync(function () { cb(null, state.profiles) })
  }
  api.getNamesById = function (cb) {
    awaitSync(function () { cb(null, state.names) })
  }
  api.getName = function (id, cb) {
    awaitSync(function () { cb(null, state.names[id]) })
  }
  api.getIdsByName = function (cb) {
    awaitSync(function () { cb(null, state.ids) })
  }
  api.getActionItems = function (cb) {
    awaitSync(function () { cb(null, state.actionItems) })
  }

  // helper to get an option off an opt function (avoids the `opt || {}` pattern)
  function o (opts, k, def) {
    return opts && opts[k] !== void 0 ? opts[k] : def
  }

  // helper to get messages from an index
  function indexStreamFn (index, getkey) {
    return function (opts) {
      // emulate the `ssb.createFeedStream` interface
      var lt    = o(opts, 'lt')
      var lte   = o(opts, 'lte')
      var gt    = o(opts, 'gt')
      var gte   = o(opts, 'gte')
      var limit = o(opts, 'limit')

      // lt, lte, gt, gte should look like:
      // [msg.value.timestamp, msg.value.author]

      // helper to create emittable rows
      function lookup (row) {
        if (!row) return
        var key = (getkey) ? getkey(row) : row.key
        if (key) {
          var rowcopy = { key: key }
          for (var k in row) { // copy index attrs into rowcopy
            if (!rowcopy[k]) rowcopy[k] = row[k]
          }
          return rowcopy
        }
      }

      // helper to fetch rows
      function fetch (row, cb) {
        sbot.get(row.key, function (err, value) {
          // if (err) {
            // suppress this error
            // the message isnt in the local cache (yet)
            // but it got into the index, likely due to a link
            // instead of an error, we'll put a null there to indicate the gap
          // }
          row.value = value
          cb(null, row)
        })
      }

      // readstream
      var readPush = pushable()
      var read = pull(readPush, paramap(fetch))

      // await sync, then emit the reads
      awaitSync(function () {
        var added = 0
        for (var i=0; i < index.rows.length; i++) {
          var row = index.rows[i]

          if (limit && added >= limit)
            break

          // we're going to only look at timestamp, because that's all that phoenix cares about
          var invalid = !!(
            (lt  && row.ts >= lt[0]) ||
            (lte && row.ts > lte[0]) ||
            (gt  && row.ts <= gt[0]) ||
            (gte && row.ts < gte[0])
          )
          if (invalid)
            continue

          var r = lookup(row)
          if (r) {
            readPush.push(r)
            added++
          }
        }
        readPush.end()
      })

      if (opts && opts.live) {
        // live stream, concat the live-emitter on the end
        index.on('add', onadd)
        var livePush = pushable(function () { index.removeListener('add', onadd) })
        function onadd (row) { livePush.push(lookup(row)) }
        var live = pull(livePush, paramap(fetch))
        return cat([read, live])
      }
      return read
    }
  }

  return api
}