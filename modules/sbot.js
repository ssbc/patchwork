var pull = require('pull-stream')
var defer = require('pull-defer')
var { Value, onceTrue, watch, Set: MutantSet } = require('mutant')
var ref = require('ssb-ref')
var Reconnect = require('pull-reconnect')
var createClient = require('ssb-client')
var createFeed = require('ssb-feed')
var nest = require('depnest')
var ssbKeys = require('ssb-keys')
var flat = require('flat')
var extend = require('xtend')
var pullResume = require('../lib/pull-resume')

exports.needs = nest({
  'config.sync.load': 'first',
  'keys.sync.load': 'first',
  'sbot.obs.connectionStatus': 'first',
  'sbot.hook.publish': 'map'
})

exports.gives = {
  sbot: {
    sync: {
      cache: true
    },
    async: {
      get: true,
      publish: true,
      addBlob: true,
      gossipConnect: true,
      friendsGet: true,
      acceptDHT: true,
      createDHT: true
    },
    pull: {
      log: true,
      userFeed: true,
      messagesByType: true,
      feed: true,
      links: true,
      backlinks: true,
      stream: true,
      resumeStream: true
    },
    obs: {
      connectionStatus: true,
      connection: true,
      connectedPeers: true,
      localPeers: true
    }
  }
}

exports.create = function (api) {
  const config = api.config.sync.load()
  const keys = api.keys.sync.load()
  var cache = {}

  var sbot = null
  var connection = Value()
  var connectionStatus = Value()
  var connectedPeers = MutantSet()
  var localPeers = MutantSet()

  var rec = Reconnect(function (isConn) {
    function notify (value) {
      isConn(value); connectionStatus.set(value)
    }

    var opts = {
      path: config.path,
      remote: config.remote,
      host: config.host,
      port: config.port,
      key: config.key,
      appKey: config.caps.shs,
      timers: config.timers,
      caps: config.caps,
      friends: config.friends
    }

    createClient(keys, opts, function (err, _sbot) {
      if (err) {
        return notify(err)
      }

      sbot = _sbot
      sbot.on('closed', function () {
        sbot = null
        connection.set(null)
        notify(new Error('closed'))
      })

      connection.set(sbot)
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

  setInterval(function () {
    if (sbot) {
      sbot.gossip.peers((err, peers) => {
        if (err) return console.error(err)
        localPeers.set(peers.filter(x => x.source === 'local').map(x => x.key))
        connectedPeers.set(peers.filter(x => x.state === 'connected').map(x => x.key))
      })
    }
  }, 1000 * 60)

  watch(connection, (sbot) => {
    if (sbot) {
      sbot.gossip.peers((err, peers) => {
        if (err) return console.error(err)
        connectedPeers.set(peers.filter(x => x.state === 'connected').map(x => x.key))
        localPeers.set(peers.filter(x => x.source === 'local').map(x => x.key))
      })
      pull(
        sbot.gossip.changes(),
        pull.drain(data => {
          if (data.peer) {
            if (data.type === 'remove' || data.type === 'disconnect') {
              connectedPeers.delete(data.peer.key)
            } else {
              if (data.peer.source === 'local') {
                localPeers.add(data.peer.key)
              }
              if (data.peer.state === 'connected') {
                connectedPeers.add(data.peer.key)
              } else {
                connectedPeers.delete(data.peer.key)
              }
            }
          }
        })
      )
    }
  })

  var feed = createFeed(internal, keys, { remote: true })

  return {
    sbot: {
      sync: {
        cache: () => cache
      },
      async: {
        get: rec.async(function (key, cb) {
          if (typeof cb !== 'function') {
            throw new Error('cb must be function')
          }
          if (cache[key]) cb(null, cache[key])
          else {
            sbot.get(key, function (err, value) {
              if (err) return cb(err)
              runHooks({ key, value })
              cb(null, value)
            })
          }
        }),
        publish: rec.async((content, cb) => {
          if (content.recps) {
            content = ssbKeys.box(content, content.recps.map(e => {
              return ref.isFeed(e) ? e : e.link
            }))
          } else {
            var flatContent = flat(content)
            Object.keys(flatContent).forEach(key => {
              var val = flatContent[key]
              if (ref.isBlob(val)) {
                sbot.blobs.push(val, err => {
                  if (err) console.error(err)
                })
              }
            })
          }

          if (sbot) {
            // instant updating of interface (just incase sbot is busy)
            runHooks({
              publishing: true,
              timestamp: Date.now(),
              value: {
                timestamp: Date.now(),
                author: keys.id,
                content
              }
            })
          }

          feed.add(content, (err, msg) => {
            if (err) console.error(err)
            else if (!cb) console.log(msg)
            cb && cb(err, msg)
          })
        }),
        addBlob: rec.async((stream, cb) => {
          return pull(
            stream,
            sbot.blobs.add(cb)
          )
        }),
        gossipConnect: rec.async(function (opts, cb) {
          sbot.gossip.connect(opts, cb)
        }),
        friendsGet: rec.async(function (opts, cb) {
          sbot.friends.get(opts, cb)
        }),
        acceptDHT: rec.async(function (opts, cb) {
          sbot.dhtInvite.accept(opts, cb)
        }),
        createDHT: rec.async(function (cb) {
          sbot.dhtInvite.create(cb)
        })
      },
      pull: {
        backlinks: rec.source(query => {
          return sbot.backlinks.read(query)
        }),
        userFeed: rec.source(opts => {
          return sbot.createUserStream(opts)
        }),
        messagesByType: rec.source(opts => {
          return sbot.messagesByType(opts)
        }),
        feed: rec.source(function (opts) {
          return pull(
            sbot.createFeedStream(opts),
            pull.through(runHooks)
          )
        }),
        log: rec.source(opts => {
          return pull(
            sbot.createLogStream(opts),
            pull.through(runHooks)
          )
        }),
        links: rec.source(function (query) {
          return sbot.links(query)
        }),
        stream: function (fn) {
          var stream = defer.source()
          onceTrue(connection, function (connection) {
            stream.resolve(fn(connection))
          })
          return stream
        },
        resumeStream: function (fn, baseOpts) {
          return function (opts) {
            var stream = defer.source()
            onceTrue(connection, function (connection) {
              stream.resolve(pullResume.remote((opts) => {
                return fn(connection, opts)
              }, extend(baseOpts, opts)))
            })
            return stream
          }
        }
      },
      obs: {
        connectionStatus: (listener) => connectionStatus(listener),
        connection,
        connectedPeers: () => connectedPeers,
        localPeers: () => localPeers
      }
    }
  }

  // scoped

  function runHooks (msg) {
    if (msg.publishing) {
      api.sbot.hook.publish(msg)
    } else if (!cache[msg.key]) {
      // cache[msg.key] = msg.value
      // api.sbot.hook.feed(msg)
    }
  }
}
