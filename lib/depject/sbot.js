const pull = require('pull-stream')
const defer = require('pull-defer')
const { Value, onceTrue, watch, Set: MutantSet } = require('mutant')
const ref = require('ssb-ref')
const Reconnect = require('pull-reconnect')
const createClient = require('ssb-client')
const nest = require('depnest')
const ssbKeys = require('ssb-keys')
const flat = require('flat')
const extend = require('xtend')
const pullResume = require('../pull-resume')

exports.needs = nest({
  'config.sync.load': 'first',
  'keys.sync.load': 'first',
  'sbot.obs.connectionStatus': 'first',
  'sbot.hook.publish': 'map',
  'progress.obs.indexes': 'first'
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
      connConnect: true,
      connRememberConnect: true,
      friendsGet: true,
      acceptDHT: true
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
      localPeers: true,
      stagedPeers: true
    }
  }
}

exports.create = function (api) {
  const config = api.config.sync.load()
  const keys = api.keys.sync.load()
  const cache = {}

  let sbot = null
  const connection = Value()
  const connectionStatus = Value()
  const connectedPeers = MutantSet()
  const localPeers = MutantSet()
  const stagedPeers = MutantSet()

  const rec = Reconnect(function (isConn) {
    function notify (value) {
      isConn(value); connectionStatus.set(value)
    }

    const opts = {
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

  watch(connection, (sbot) => {
    if (sbot) {
      pull(
        sbot.conn.peers(),
        pull.drain(entries => {
          var peers = entries.filter(([, x]) => !!x.key).map(([address, data]) => ({ address, data }))
          localPeers.set(peers.filter(peer => peer.data.type === 'lan'))
          connectedPeers.set(peers.filter(peer => peer.data.state === 'connected'))
        })
      )

      pull(
        sbot.conn.stagedPeers(),
        pull.drain(entries => {
          var peers = entries.filter(([, x]) => !!x.key).map(([address, data]) => ({ address, data }))
          stagedPeers.set(peers)
        })
      )
    }
  })

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
            const options = typeof key === 'string'
              ? { private: true, id: key }
              : key

            sbot.get(options, function (err, value) {
              if (err) return cb(err)
              runHooks({ key, value })
              cb(null, value)
            })
          }
        }),
        publish: rec.async((content, cb) => {
          const indexes = api.progress.obs.indexes()
          const progress = indexes()
          const pending = progress.target - progress.current || 0

          if (pending) {
            const err = new Error('Cowardly refusing to publish your message while database is still indexing. Please try again once indexing is finished.')

            if (typeof cb === 'function') {
              return cb(err)
            } else {
              console.error(err.toString())
              return
            }
          }

          if (content.recps) {
            content = ssbKeys.box(content, content.recps.map(e => {
              return ref.isFeed(e) ? e : e.link
            }))
          } else {
            const flatContent = flat(content)
            Object.keys(flatContent).forEach(key => {
              const val = flatContent[key]
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

          sbot.publish(content, (err, msg) => {
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
        connConnect: rec.async(function (address, data, cb) {
          sbot.conn.connect(address, data, cb)
        }),
        connRememberConnect: rec.async(function (address, data, cb) {
          sbot.conn.remember(address, { autoconnect: true, ...data }, (err) => {
            if (err) cb(err)
            else sbot.conn.connect(address, data, cb)
          })
        }),
        friendsGet: rec.async(function (opts, cb) {
          sbot.friends.get(opts, cb)
        }),
        acceptDHT: rec.async(function (opts, cb) {
          sbot.dhtInvite.accept(opts, cb)
        }),
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
          const stream = defer.source()
          onceTrue(connection, function (connection) {
            stream.resolve(fn(connection))
          })
          return stream
        },
        resumeStream: function (fn, baseOpts) {
          return function (opts) {
            const stream = defer.source()
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
        localPeers: () => localPeers,
        stagedPeers: () => stagedPeers
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
