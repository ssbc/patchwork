var fs          = require('fs')
var sqlite3     = require('sqlite3')
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
var threadlib   = require('patchwork-threads')
var u           = require('./util')

exports.name        = 'patchwork'
exports.version     = '1.0.0'
exports.manifest    = require('./manifest')
exports.permissions = require('./permissions')

exports.init = function (sbot, opts) {

  var api = {}
  var patchworkdb = sbot.sublevel('patchwork')
  var db = {
    isread: patchworkdb.sublevel('isread'),
    bookmarked: patchworkdb.sublevel('bookmarked'),
    channelpinned: patchworkdb.sublevel('channelpinned')
  }
  var state = {
    sqldb: new sqlite3.Database(':memory:'),//'/Users/paulfrazee/tmp/testdb1.sqlite'),

    // indexes (lists of {key:, ts:})
    mymsgs: [],
    newsfeed: u.index('newsfeed'),
    inbox: u.index('inbox'),
    bookmarks: u.index('bookmarks'),
    notifications: u.index('notifications'),
    // other indexes: channel-* are created as needed

    // views
    profiles: {},
    names: {}, // ids -> names
    ids: {}, // names -> ids
    actionItems: {}
  }

  //
  // sql tables
  //
  // TODO create sql indexes

  state.sqldb.serialize() // need to execute serially for safety

  // all common message data
  var create = 'CREATE TABLE msgs ('
    // log data
    +'key BLOB PRIMARY KEY, '
    +'author BLOB, '
    +'send_time REAL, '
    +'recv_time REAL, '
    +'is_encrypted INTEGER, '
    +'content_type TEXT'
  +');'
  console.log(create)
  state.sqldb.run(create)

  // all message links
  create = 'CREATE TABLE msg_links ('
    +'rel TEXT, '
    +'src_key BLOB, ' // message containing the link
    +'src_author BLOB, ' // author that published the link
    +'dst_key BLOB, ' // link target
    +'dst_type TEXT' // what type of object is the dst? feed, msg, or blob
  +');'
  console.log(create)
  state.sqldb.run(create)

  // local state meta: is bookmarked
  var create = 'CREATE TABLE msg_bookmarks ('
    +'msg_key BLOB PRIMARY KEY, '
    +'is_bookmarked INTEGER'
  +');'
  console.log(create)
  state.sqldb.run(create)

  // local state meta: is read
  var create = 'CREATE TABLE msg_isreads ('
    +'msg_key BLOB PRIMARY KEY, '
    +'is_read INTEGER'
  +');'
  console.log(create)
  state.sqldb.run(create)

  // post messages
  create = 'CREATE TABLE post_msgs ('
    // meta
    +'msg_key BLOB PRIMARY KEY, '

    // log data
    +'channel TEXT, '
    +'text TEXT, ' // post content
    +'root_msg_key BLOB, ' // in threads, the root link (optional)
    +'branch_msg_key BLOB' // in threads, the branch link (optional)
  +');'
  console.log(create)
  state.sqldb.run(create)

  // computed votes
  create = 'CREATE TABLE votes ('
    // meta
    +'key BLOB PRIMARY KEY, ' // a computed key, (author+dst_key), to uniquely identify the vote
    +'dst_key BLOB, ' // object this vote is for
    +'dst_type TEXT, ' // what type of object is the dst? feed, msg, or blob
    +'author BLOB, ' // author of this vote

    // data
    +'vote INTEGER, ' // -1, 0, 1
    +'reason TEXT' // optional explanation for the vote
  +');'
  console.log(create)
  state.sqldb.run(create)

  // computed profiles on ssb objects (feeds, msgs, and blobs)
  // NOTE: these are "subjective" profiles, meaning this is the profile 'as claimed by $author'
  create = 'CREATE TABLE profiles ('
    // meta
    +'key BLOB PRIMARY KEY, ' // a computed key, (author+dst_key), to uniquely identify the profile
    +'dst_key BLOB, ' // object this profile is about
    +'dst_type TEXT, ' // what type of object is the dst? feed, msg, or blob
    +'author BLOB, ' // author of this profile

    // data
    +'name TEXT, '
    +'image_key BLOB, '
    +'is_author_following INTEGER, '
    +'is_author_blocking INTEGER'
  +');'
  console.log(create)
  state.sqldb.run(create)

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
      var obj = { key: key, value: null, isread: false }
      db.isread.get(key, function (err, isread) { obj.isread = isread; done() })
      sbot.get(key, function (err, value) { obj.value = value; done() })
      state.sqldb.run('INSERT INTO msg_bookmarks (msg_key, is_bookmarked) VALUES (?, ?);', [key, 1], done)
      var n=0;
      function done() {
        if (++n == 3) cb(null, obj)
      }
    }),
    pull.drain(
      function (msg) {
        if (msg.value) {
          var row = state.bookmarks.sortedUpsert(msg.value.timestamp, msg.key)
          row.isread = msg.isread
        }
      },
      function () { state.pdec() }
    )
  )

  // load isread into an index
  state.pinc()
  pull(
    pl.read(db.isread, { keys: true, values: true }),
    pull.asyncMap(function (kv, cb) {
      state.sqldb.run('INSERT INTO msg_isreads (msg_key, is_read) VALUES (?, ?);', [kv.key, +kv.value], cb)
    }),
    pull.onEnd(function () { state.pdec() })
  )

  // load channelpins into indexes
  state.pinc()
  pull(
    pl.read(db.channelpinned, { keys: true, values: true }),
    pull.drain(function (pin) {
      if (typeof pin.key === 'string') {
        var index = getChannelIndex(pin.key)
        index.pinned = pin.value
      }
    },
    function () { state.pdec() })
  )

  // setup sbot log processor
  var processor = require('./processor')(sbot, db, state, emit)
  pull(pl.read(sbot.sublevel('log'), { live: true, onSync: onHistorySync }), pull.drain(processor))

  var isHistorySynced = false // track so we dont emit events for old messages
  // grab for history sync
  state.pinc()
  function onHistorySync () {
    console.log('Log history read...')
    // when all current items finish, consider prehistory synced (and start emitting)
    awaitSync(function () { 
      console.log('Indexes generated')
      state.sqldb.get('SELECT COUNT(msg_key) FROM post_msgs;', console.log.bind(console, 'total posts'))
      state.sqldb.get('SELECT COUNT(key) FROM msgs WHERE content_type="post" AND is_encrypted=1;', console.log.bind(console, 'encrypted posts'))
      state.sqldb.get('SELECT COUNT(key) FROM msgs WHERE content_type="post" AND author=?;', [sbot.id], console.log.bind(console, 'my posts'))
      state.sqldb.get(
        'SELECT COUNT(post_msgs.msg_key) FROM post_msgs'
          +' LEFT OUTER JOIN msg_links ON msg_links.src_key = post_msgs.msg_key AND msg_links.rel = "recps"'
          +' WHERE post_msgs.root_msg_key IS NULL'
            +' AND msg_links.dst_key IS NULL;', console.log.bind(console, 'newsfeed'))
      state.sqldb.all(
        'SELECT channel, COUNT(post_msgs.msg_key) FROM post_msgs'
          +' LEFT OUTER JOIN msg_links ON msg_links.src_key = post_msgs.msg_key AND msg_links.rel = "recps"'
          +' WHERE post_msgs.root_msg_key IS NULL'
            +' AND msg_links.dst_key IS NULL'
          +' GROUP BY post_msgs.channel', console.log.bind(console, 'by_channel'))
      state.sqldb.get(
        'SELECT COUNT(post_msgs.msg_key) FROM post_msgs'
          +' INNER JOIN msg_links ON post_msgs.msg_key = msg_links.src_key AND msg_links.rel = "recps"'
          +' WHERE post_msgs.root_msg_key IS NULL AND msg_links.dst_key = ?;', [sbot.id], console.log.bind(console, 'inbox'))
      state.sqldb.get(
        'SELECT COUNT(post_msgs.msg_key) FROM post_msgs'
          +' INNER JOIN msg_links ON post_msgs.msg_key = msg_links.src_key AND msg_links.rel = "recps"'
          +' LEFT JOIN msg_isreads ON msg_isreads.msg_key = post_msgs.msg_key'
          +' WHERE post_msgs.root_msg_key IS NULL AND msg_links.dst_key = ? AND (msg_isreads.is_read IS NULL OR msg_isreads.is_read = 0);', [sbot.id], console.log.bind(console, 'inbox_unread'))
      state.sqldb.get(
        'SELECT COUNT(post_msgs.msg_key) FROM post_msgs'
          +' LEFT JOIN msg_bookmarks ON msg_bookmarks.msg_key = post_msgs.msg_key'
          +' WHERE post_msgs.root_msg_key IS NULL AND msg_bookmarks.is_bookmarked = 1;', console.log.bind(console, 'bookmarks'))
      state.sqldb.all('SELECT name, image_key FROM profiles WHERE dst_key=author;', console.log.bind(console, 'profiles'))
      isHistorySynced = true
    })
    // release
    state.pdec()
  }

  // events stream
  var notify = Notify()
  function emit (type, data) {
    if (!isHistorySynced)
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
      var counts = {
        newsfeed: state.newsfeed.rows.length,
        inbox: state.inbox.rows.length,
        inboxUnread: state.inbox.filter(function (row) { return !row.isread }).length,
        bookmarks: state.bookmarks.rows.length,
        bookmarksUnread: state.bookmarks.filter(function (row) { return !row.isread }).length,
        notificationsUnread: state.notifications.countUntouched()
      }
      for (var k in state) {
        if (k.indexOf('channel-') === 0)
          counts[k] = state[k].rows.length
      }
      cb(null, counts)
    })
  }

  api.createNewsfeedStream = indexStreamFn(state.newsfeed)
  api.createInboxStream = indexStreamFn(state.inbox)
  api.createBookmarkStream = indexStreamFn(state.bookmarks)
  api.createNotificationsStream = indexStreamFn(state.notifications)
  api.createChannelStream = function (channel, opts) {
    if (typeof channel !== 'string' || !channel.trim())
      return cb(new Error('Invalid channel'))
    var index = getChannelIndex(channel)
    return indexStreamFn(index)(opts)
  }

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
    awaitSync(function () {
      indexMarkRead('inbox', key)
      indexMarkRead('bookmarks', key)
      if (Array.isArray(key)) {
        db.isread.batch(key.map(function (k) { return { type: 'put', key: k, value: 1 }}), cb)
        key.forEach(function (key) { emit('isread', { key: key, value: true }) })
      } else {
        db.isread.put(key, 1, cb)
        emit('isread', { key: key, value: true })
      }
    })
  }
  api.markUnread = function (key, cb) {
    awaitSync(function () {
      indexMarkUnread('inbox', key)
      indexMarkUnread('bookmarks', key)
      if (Array.isArray(key)) {
        db.isread.batch(key.map(function (k) { return { type: 'del', key: k }}), cb)
        key.forEach(function (key) { emit('isread', { key: key, value: false }) })
      } else {
        db.isread.del(key, cb) 
        emit('isread', { key: key, value: false })
      }
    })
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
      var done = multicb({ pluck: 1, spread: true })
      db.bookmarked.put(key, 1, done()) // update bookmarks index
      u.getThreadHasUnread(sbot, key, done()) // get the target thread's read/unread state
      done(function (err, putRes, hasUnread) {
        // insert into the bookmarks index
        var bookmarksRow = state.bookmarks.sortedUpsert(value.timestamp, key)
        bookmarksRow.isread = !hasUnread // set isread state
        emit('index-change', { index: 'bookmarks' })
        cb(err, putRes)
      })
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

  function getChannelIndex (channel) {
    var k = 'channel-'+channel
    var index = state[k]
    if (!index)
      index = state[k] = u.index(k)
    return index
  }
  api.getChannels = function (cb) {
    awaitSync(function () {
      var channels = []
      for (var k in state) {
        if (k.indexOf('channel-') === 0) {
          var lastUpdated = (state[k].rows[0]) ? state[k].rows[0].ts : 0
          channels.push({
            name: k.slice('channel-'.length),
            lastUpdated: lastUpdated,
            pinned: state[k].pinned
          })
        }
      }
      cb(null, channels)
    })
  }
  api.pinChannel = function (channel, cb) {
    var index = getChannelIndex(channel)
    index.pinned = true
    db.channelpinned.put(channel, 1, cb)
    emit('channelpinned', { channel: channel, value: true })
  }
  api.unpinChannel = function (channel, cb) {
    var index = getChannelIndex(channel)
    index.pinned = false
    db.channelpinned.del(channel, cb) 
    emit('channelpinned', { channel: channel, value: false })
  }
  api.toggleChannelPinned = function (channel, cb) {
    var index = getChannelIndex(channel)
    if (index.pinned) {
      api.unpinChannel(channel, function (err) {
        cb(err, true)
      })
    } else {
      api.pinChannel(channel, function (err) {
        cb(err, false)
      })
    }
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
      var lastAccessed = index.lastAccessed
      index.touch()

      // emulate the `ssb.createFeedStream` interface
      var lt      = o(opts, 'lt')
      var lte     = o(opts, 'lte')
      var gt      = o(opts, 'gt')
      var gte     = o(opts, 'gte')
      var limit   = o(opts, 'limit')
      var threads = o(opts, 'threads')

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
        if (threads) {
          threadlib.getPostSummary(sbot, row.key, function (err, thread) {
            for (var k in thread)
              row[k] = thread[k]
            cb(null, row)
          })
        } else {
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
            r.isNew = r.ts > lastAccessed
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