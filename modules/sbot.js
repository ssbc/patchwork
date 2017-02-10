var pull = require('pull-stream')
var ssbKeys = require('ssb-keys')
var ref = require('ssb-ref')
var Reconnect = require('pull-reconnect')

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
var createClient = require('ssb-client')

var createFeed = require('ssb-feed')
var keys = require('patchbay/keys')

var cache = CACHE = {}

exports.needs = {
  connection_status: 'map',
  config: 'first'
}

exports.gives = {
//    connection_status: true,
  sbot: {
    blobs_add: true,
    links: true,
    links2: true,
    query: true,
    fulltext_search: true,
    get: true,
    log: true,
    user_feed: true,
    gossip_peers: true,
    gossip_connect: true,
    progress: true,
    publish: true,
    whoami: true,

    // additional
    get_id: true
  }
}

exports.create = function (api) {

  var sbot = null
  var config = api.config()

  var rec = Reconnect(function (isConn) {
    function notify (value) {
      isConn(value); api.connection_status(value)
    }

    createClient(config.keys, config, function (err, _sbot) {
      if(err)
        return notify(err)

      sbot = _sbot
      sbot.on('closed', function () {
        sbot = null
        notify(new Error('closed'))
      })

      notify()
    })
  })

  var internal = {
    getLatest: rec.async(function (id, cb) {
      sbot.getLatest(id, cb)
    }),
    add: rec.async(function (msg, cb) {
      sbot.add(msg, cb)
    })
  }

  var feed = createFeed(internal, keys, {remote: true})

  return {
    // connection_status,
    sbot: {
      blobs_add: rec.sink(function (cb) {
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
      }),
      links: rec.source(function (query) {
        return sbot.links(query)
      }),
      links2: rec.source(function (query) {
        return sbot.links2.read(query)
      }),
      query: rec.source(function (query) {
        return sbot.query.read(query)
      }),
      log: rec.source(function (opts) {
        return pull(
          sbot.createLogStream(opts),
          pull.through(function (e) {
            CACHE[e.key] = CACHE[e.key] || e.value
          })
        )
      }),
      user_feed: rec.source(function (opts) {
        return sbot.createUserStream(opts)
      }),
      fulltext_search: rec.source(function (opts) {
        return sbot.fulltext.search(opts)
      }),
      get: rec.async(function (key, cb) {
        if('function' !== typeof cb)
          throw new Error('cb must be function')
        if(CACHE[key]) cb(null, CACHE[key])
        else sbot.get(key, function (err, value) {
          if(err) return cb(err)
          cb(null, CACHE[key] = value)
        })
      }),
      gossip_peers: rec.async(function (cb) {
        sbot.gossip.peers(cb)
      }),
      //liteclient won't have permissions for this
      gossip_connect: rec.async(function (opts, cb) {
        sbot.gossip.connect(opts, cb)
      }),
      progress: rec.source(function () {
        return sbot.replicate.changes()
      }),
      publish: rec.async(function (content, cb) {
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
      }),
      whoami: rec.async(function (cb) {
        sbot.whoami(cb)
      }),

      // ADDITIONAL:

      get_id: function () {
        return keys.id
      }
    }
  }
}
