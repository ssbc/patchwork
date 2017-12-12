var Channels = require('./channels')
var Heartbeat = require('./heartbeat')
var Subscriptions = require('./subscriptions')
var Roots = require('./roots')
var Progress = require('./progress')
var Search = require('./search')
var RecentFeeds = require('./recent-feeds')
var LiveBacklinks = require('./live-backlinks')
var pull = require('pull-stream')
var ref = require('ssb-ref')

exports.name = 'patchwork'
exports.version = require('../package.json').version
exports.manifest = {
  channels: 'source',
  subscriptions: 'source',
  roots: 'source',
  latest: 'source',
  linearSearch: 'source',
  progress: 'source',
  recentFeeds: 'source',
  heartbeat: 'source',

  getSubscriptions: 'async',
  getChannels: 'async',

  liveBacklinks: {
    subscribe: 'sync',
    unsubscribe: 'sync',
    stream: 'source'
  },

  disconnect: 'async'
}

exports.init = function (ssb, config) {
  var progress = Progress(ssb, config)
  var channels = Channels(ssb, config)
  var subscriptions = Subscriptions(ssb, config)
  var roots = Roots(ssb, config)
  var search = Search(ssb, config)
  var recentFeeds = RecentFeeds(ssb, config)

  // prioritize pubs that we actually follow
  pull(
    ssb.friends.createFriendStream({hops: 1, live: false}),
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

  return {
    heartbeat: Heartbeat(ssb, config),
    channels: channels.stream,
    subscriptions: subscriptions.stream,
    roots: roots.read,
    latest: roots.latest,
    progress: progress.stream,
    recentFeeds: recentFeeds.stream,
    linearSearch: search.linear,
    getSubscriptions: subscriptions.get,
    getChannels: channels.get,
    liveBacklinks: LiveBacklinks(ssb, config),

    disconnect: function (opts, cb) {
      if (ref.isFeed(opts)) opts = {key: opts}
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
}
