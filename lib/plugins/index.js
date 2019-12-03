const Heartbeat = require('./heartbeat')
const Subscriptions = require('./subscriptions')
const Progress = require('./progress')
const Search = require('./search')
const RecentFeeds = require('./recent-feeds')
const LiveBacklinks = require('./live-backlinks')
const pull = require('pull-stream')
const pCont = require('pull-cont/source')

const plugins = {
  likes: require('./likes'),
  backlinks: require('./backlinks'),
  profile: require('./profile'),
  suggest: require('ssb-suggest'),
  publicFeed: require('./public-feed'),
  subscriptions2: require('./subscriptions2'),
  thread: require('./thread'),
  privateFeed: require('./private-feed'),
  mentionsFeed: require('./mentions-feed'),
  gatherings: require('./gatherings'),
  networkFeed: require('./network-feed'),
  channelFeed: require('./channel-feed'),
  participatingFeed: require('./participating-feed'),
  channels: require('./channels'),
  contacts: require('./contacts')
}

const ref = require('ssb-ref')

exports.name = 'patchwork'
exports.version = require('../../package.json').version
exports.manifest = {
  subscriptions: 'source',
  linearSearch: 'source',
  privateSearch: 'source',

  progress: 'source',
  recentFeeds: 'source',
  heartbeat: 'source',

  getSubscriptions: 'async',

  liveBacklinks: {
    subscribe: 'sync',
    unsubscribe: 'sync',
    stream: 'source'
  },

  disconnect: 'async'
}

for (const key in plugins) {
  exports.manifest[key] = plugins[key].manifest
}

exports.init = function (ssb, config) {
  const progress = Progress(ssb)
  const subscriptions = Subscriptions(ssb)
  const search = Search(ssb)
  const recentFeeds = RecentFeeds(ssb)
  const replicating = new Set()

  const patchwork = {
    heartbeat: Heartbeat(),
    subscriptions: subscriptions.stream,
    progress: progress.stream,
    recentFeeds: recentFeeds.stream,
    linearSearch: search.linear,
    privateSearch: search.privateLinear,
    getSubscriptions: subscriptions.get,
    liveBacklinks: LiveBacklinks(ssb),

    disconnect: function (addr, cb) {
      ssb.conn.disconnect(addr, cb)
      return true
    }
  }

  for (const key in plugins) {
    patchwork[key] = plugins[key].init(ssb, config)
  }

  // CONNECTIONS
  // refuse connections from blocked peers
  ssb.auth.hook(function (fn, args) {
    const self = this
    patchwork.contacts.isBlocking({ source: ssb.id, dest: args[0] }, function (_, blocked) {
      if (blocked) {
        args[1](new Error('Client is blocked'))
      } else {
        fn.apply(self, args)
      }
    })
  })

  // manually populate peer table from {type: 'pub'} messages
  // exclude blocked pubs, only accept broadcasts from people within 2 hops
  // wait 10 seconds after start before doing it to ease initial load
  // (gossip.autoPopulate is disabled in config)
  setTimeout(() => {
    const discovered = new Set()
    patchwork.contacts.raw.get((err, graph) => {
      if (err) return
      pull(
        ssb.messagesByType({ type: 'pub', live: true, keys: false }),
        pull.drain(function (value) {
          if (value.sync && config.gossip && config.gossip.prune) {
            // clean up pubs announced by peers more than 2 hops away if `--gossip.prune=true`
            ssb.conn.query().peersConnectable('db').forEach(([addr, data]) => {
              if (!discovered.has(data.key) && data.type === 'pub') {
                ssb.conn.forget(addr)
              }
            })
          }

          if (!value.content) return
          const address = value.content.address
          if (replicating.has(value.author) && address && ref.isFeed(address.key)) {
            // ignore blocked pubs
            const blocking = graph && graph[ssb.id] && graph[ssb.id][address.key] === false
            if (blocking) return
            // make multiserver address as a string
            let msAddr
            try {
              msAddr = ref.toMultiServerAddress(address)
            } catch (err) {
              return
            }
            // do not override room entries even if people declared them to be pubs
            const oldEntry = ssb.conn.db().get(msAddr)
            if (oldEntry && oldEntry.type === 'room') return
            // add pub to the CONN database
            discovered.add(address.key)
            ssb.conn.remember(msAddr, { type: 'pub', key: address.key, autoconnect: true })
          }
        })
      )
    })
  }, 10e3)

  // REPLICATION
  // keep replicate up to date with replicateStream (replacement for ssb-friends)
  pull(
    patchwork.contacts.replicateStream({ live: true }),
    pull.drain(state => {
      for (const feedId in state) {
        // track replicating for use by pub announcement filtering
        if (state[feedId] === true) replicating.add(feedId)
        else replicating.delete(feedId)

        // request (or unrequest) the feed
        ssb.replicate.request(feedId, state[feedId] === true)
      }
    })
  )

  // update ebt with latest block info
  pull(
    patchwork.contacts.raw.stream({ live: true }),
    pull.drain((data) => {
      if (!data) return
      for (var from in data) {
        for (var to in data[from]) {
          var value = data[from][to]
          ssb.ebt.block(from, to, value === false)
        }
      }
    })
  )

  // use blocks in legacy replication (adapted from ssb-friends for legacy compat)
  ssb.createHistoryStream.hook(function (fn, args) {
    const opts = args[0]
    const peer = this
    return pCont(cb => {
      // wait till the index has loaded.
      patchwork.contacts.raw.get((_, graph) => {
        // don't allow the replication if the feed being requested blocks the requester
        const requesterId = peer.id
        const feedId = opts.id
        if (graph && feedId !== requesterId && graph[feedId] && graph[feedId][requesterId] === false) {
          cb(null, function (abort, cb) {
            // just give them the cold shoulder
            // `abort` and `cb` are passed to avoid a pull-cont error
          })
        } else {
          cb(null, pull(
            fn.apply(peer, args),
            // break off this feed if they suddenly block the recipient.
            pull.take(function (msg) {
              // handle when createHistoryStream is called with keys: true
              if (!msg.content && msg.value.content) msg = msg.value
              if (msg.content.type !== 'contact') return true
              return !(
                msg.content.blocking && msg.content.contact === peer.id
              )
            })
          ))
        }
      })
    })
  })

  return patchwork
}
