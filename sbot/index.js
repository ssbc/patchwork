var Heartbeat = require('./heartbeat')
var Subscriptions = require('./subscriptions')
var Progress = require('./progress')
var Search = require('./search')
var RecentFeeds = require('./recent-feeds')
var LiveBacklinks = require('./live-backlinks')
var pull = require('pull-stream')
var pCont = require('pull-cont/source')

var plugins = {
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

var ref = require('ssb-ref')

exports.name = 'patchwork'
exports.version = require('../package.json').version
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

for (var key in plugins) {
  exports.manifest[key] = plugins[key].manifest
}

exports.init = function (ssb, config) {
  var progress = Progress(ssb, config)
  var subscriptions = Subscriptions(ssb, config)
  var search = Search(ssb, config)
  var recentFeeds = RecentFeeds(ssb, config)
  var replicating = new Set()

  var patchwork = {
    heartbeat: Heartbeat(ssb, config),
    subscriptions: subscriptions.stream,
    progress: progress.stream,
    recentFeeds: recentFeeds.stream,
    linearSearch: search.linear,
    privateSearch: search.privateLinear,
    getSubscriptions: subscriptions.get,
    liveBacklinks: LiveBacklinks(ssb, config),

    disconnect: function (opts, cb) {
      if (ref.isFeed(opts)) opts = { key: opts }
      if (opts && (opts.key || opts.host)) {
        ssb.gossip.peers().find(peer => {
          if (peer.state === 'connected' && (peer.key === opts.key || peer.host === opts.host)) {
            ssb.gossip.disconnect(peer, cb)
            return true
          }
        })
      }
    }
  }

  for (var key in plugins) {
    patchwork[key] = plugins[key].init(ssb, config)
  }

  // CONNECTIONS
  // prioritize friends for pub connections and remove blocked pubs (on startup)
  patchwork.contacts.raw.get((err, graph) => {
    if (!err) {
      ssb.gossip.peers().slice().forEach((peer) => {
        if (graph && graph[ssb.id]) {
          var value = graph[ssb.id][peer.key]
          if (value === true) { // following pub
            ssb.gossip.add(peer, 'friends')
          } else if (value === false) { // blocked pub
            ssb.gossip.remove(peer.key)
          }
        }
      })
    }
  })

  // refuse connections from blocked peers
  ssb.auth.hook(function (fn, args) {
    var self = this
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
    var discovered = new Set()
    patchwork.contacts.raw.get((err, graph) => {
      if (err) return
      pull(
        ssb.messagesByType({ type: 'pub', live: true, keys: false }),
        pull.drain(function (value) {
          if (value.sync && config.gossip && config.gossip.prune) {
            // clean up pubs announced by peers more than 2 hops away if `--gossip.prune=true`
            ssb.gossip.peers().slice().forEach(peer => {
              if (!discovered.has(peer.key)) {
                ssb.gossip.remove(peer, 'pub')
              }
            })
          }

          if (!value.content) return
          var address = value.content.address
          if (replicating.has(value.author) && address && ref.isFeed(address.key)) {
            var blocking = graph && graph[ssb.id] && graph[ssb.id][address.key] === false
            if (!blocking) {
              discovered.add(address.key)
              ssb.gossip.add(address, 'pub')
            }
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
      for (var feedId in state) {
        // track replicating for use by pub announcement filtering
        if (state[feedId] === true) replicating.add(feedId)
        else replicating.delete(feedId)

        // request (or unrequest) the feed
        ssb.replicate.request(feedId, state[feedId] === true)

        // if blocking and a pub, drop connection and remove from peer table
        if (state[feedId] === false) {
          var peer = ssb.gossip.get(feedId)
          if (peer) {
            if (peer.state === 'connected') {
              ssb.gossip.disconnect(peer, () => {
                ssb.gossip.remove(peer)
              })
            }
          }
        }
      }
    })
  )

  // use blocks in legacy replication (adapted from ssb-friends for legacy compat)
  ssb.createHistoryStream.hook(function (fn, args) {
    var opts = args[0]
    var peer = this
    return pCont(cb => {
      // wait till the index has loaded.
      patchwork.contacts.raw.get((_, graph) => {
        // don't allow the replication if the feed being requested blocks the requester
        var requesterId = peer.id
        var feedId = opts.id
        if (graph && feedId !== requesterId && graph[feedId] && graph[feedId][requesterId] === false) {
          cb(null, function (abort, cb) {
            // just give them the cold shoulder
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


  const deleting = []

  ssb.addMap((msg, cb) => {
    cb(null, msg)

    patchwork.contacts.isBlocking({ source: ssb.id, dest: msg.value.author }, function (_, blocked) {
      if (blocked) {
        console.log('blocked', msg.key)

        if (deleting.includes(msg.key)) {
          return
        }

        deleting.push(msg.key)

        ssb.keysDb.get(msg.key, (err, item) => {
          if (err) return console.error('error getting seq: ', err)
          ssb.del(item.seq, (err) => {
            if (err) console.error('error deleting: ', err)
            console.log('deleted', msg.key)
          })
        })
      }
    })
  })

  return patchwork
}
