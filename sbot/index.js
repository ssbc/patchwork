var Heartbeat = require('./heartbeat')
var Subscriptions = require('./subscriptions')
var Progress = require('./progress')
var Search = require('./search')
var RecentFeeds = require('./recent-feeds')
var LiveBacklinks = require('./live-backlinks')

var plugins = {
  likes: require('./likes'),
  backlinks: require('./backlinks'),
  profile: require('./profile'),
  publicFeed: require('./public-feed'),
  subscriptions2: require('./subscriptions2'),
  thread: require('./thread'),
  privateFeed: require('./private-feed'),
  mentionsFeed: require('./mentions-feed'),
  gatherings: require('./gatherings'),
  networkFeed: require('./network-feed'),
  channelFeed: require('./channel-feed'),
  channels: require('./channels'),
  contacts: require('./contacts')
}

var pull = require('pull-stream')
var ref = require('ssb-ref')

exports.name = 'patchwork'
exports.version = require('../package.json').version
exports.manifest = {
  subscriptions: 'source',
  linearSearch: 'source',
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

  // prioritize pubs that we actually follow
  pull(
    ssb.friends.createFriendStream({ hops: 1, live: false }),
    pull.collect((err, contacts) => {
      if (!err) {
        ssb.gossip.peers().forEach(function (peer) {
          if (contacts.includes(peer.key)) {
            ssb.gossip.add(peer, 'friends')
          }
        })
      }
    })
  )

  var result = {
    heartbeat: Heartbeat(ssb, config),
    subscriptions: subscriptions.stream,
    progress: progress.stream,
    recentFeeds: recentFeeds.stream,
    linearSearch: search.linear,
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
    result[key] = plugins[key].init(ssb, config)
  }

  return result
}
