var pull = require('pull-stream')
var ssbKeys = require('ssb-keys')
var ref = require('ssb-ref')
var InfoCache = require('./info-cache')

function Hash (onHash) {
  var buffers = []
  return pull.through(function (data) {
    buffers.push('string' === typeof data
      ? new Buffer(data, 'utf8')
      : data
    )
  }, function (err) {
    if(err && !onHash) throw err
    var b = buffers.length > 1 ? Buffer.concat(buffers) : buffers[0]
    var h = '&'+ssbKeys.hash(b)
    onHash && onHash(err, h)
  })
}
//uncomment this to use from browser...
//also depends on having ssb-ws installed.
//var createClient = require('ssb-lite')

var createFeed = require('ssb-feed')
var cache = CACHE = {}

module.exports = function (sbot, opts) {
  var connection_status = []
  var keys = opts.keys
  var infoCache = InfoCache()

  var internal = {
    getLatest: function (id, cb) {
      sbot.getLatest(id, cb)
    },
    add: function (msg, cb) {
      sbot.add(msg, cb)
    }
  }

  var feed = createFeed(internal, keys, {remote: true})

  setImmediate((x) => {
    connection_status.forEach(fn => fn())
  })

  return {
    connection_status: connection_status,
    get_id: function () {
      return sbot.id
    },
    get_likes: function (id) {
      return infoCache.getLikes(id)
    },
    obs_channels: function () {
      return infoCache.channels
    },
    update_cache: function (msg) {
      infoCache.updateFrom(msg)
    },
    sbot_blobs_add: function (cb) {
      return pull(
        Hash(function (err, id) {
          if(err) return cb(err)
          //completely UGLY hack to tell when the blob has been sucessfully written...
          var start = Date.now(), n = 5
          ;(function next () {
            setTimeout(function () {
              sbot.blobs.has(id, function (err, has) {
                if(has) return cb(null, id)
                if(n--) next()
                else cb(new Error('write failed'))
              })
            }, Date.now() - start)
          })()
        }),
        sbot.blobs.add()
      )
    },
    sbot_links: function (query) {
      return sbot.links(query)
    },
    sbot_links2: function (query) {
      return sbot.links2.read(query)
    },
    sbot_query: function (query) {
      return sbot.query.read(query)
    },
    sbot_log: function (opts) {
      return pull(
        sbot.createLogStream(opts),
        pull.through(function (e) {
          CACHE[e.key] = CACHE[e.key] || e.value
          infoCache.updateFrom(e)
        })
      )
    },
    sbot_user_feed: function (opts) {
      return sbot.createUserStream(opts)
    },
    sbot_get: function (key, cb) {
      if(CACHE[key] && CACHE[key].value) cb(null, CACHE[key].value)
      else sbot.get(key, function (err, value) {
        if(err) return cb(err)
        CACHE[key] = {key, value}
        cb(null, value)
      })
    },
    sbot_gossip_peers: function (cb) {
      sbot.gossip.peers(cb)
    },
    //liteclient won't have permissions for this
    sbot_gossip_connect: function (opts, cb) {
      sbot.gossip.connect(opts, cb)
    },
    sbot_publish: function (content, cb) {
      if(content.recps)
        content = ssbKeys.box(content, content.recps.map(function (e) {
          return ref.isFeed(e) ? e : e.link
        }))
      else if(content.mentions)
        content.mentions.forEach(function (mention) {
          if(ref.isBlob(mention.link)) {
            sbot.blobs.push(mention.link, function (err) {
              if(err) console.error(err)
            })
          }
        })

      feed.add(content, function (err, msg) {
        if(err) console.error(err)
        else if(!cb) console.log(msg)
        cb && cb(err, msg)
      })
    },
    sbot_whoami: function (cb) {
      sbot.whoami(cb)
    },
    sbot_progress: function () {
      return sbot.replicate.changes()
    }
  }
}
