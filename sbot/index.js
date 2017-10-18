var Channels = require('./channels')
var Heartbeat = require('./heartbeat')
var Subscriptions = require('./subscriptions')
var Roots = require('./roots')
var Progress = require('./progress')
var Search = require('./search')
var RecentFeeds = require('./recent-feeds')
var LiveBacklinks = require('./live-backlinks')
var pull = require('pull-stream')

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
  }
}

exports.init = function (ssb, config) {
  var progress = Progress(ssb, config)
  var channels = Channels(ssb, config)
  var subscriptions = Subscriptions(ssb, config)
  var roots = Roots(ssb, config)
  var search = Search(ssb, config)
  var recentFeeds = RecentFeeds(ssb, config)

  pull(
    ssb.friends.createFriendStream({live: false}),
    pull.drain(() => {}, () => {
      // don't assign peer friends until friends have loaded
      ssb.friends.hops({start: ssb.id, hops: 2}, function (_, following) {
        ssb.gossip.peers().forEach(function (peer) {
          if (following[peer.key]) {
            // we follow them, or follow someone that follows them!
            ssb.gossip.add(peer, 'friends')
          } else {
            ssb.friends.hops({start: peer.key, hops: 2}, function (_, result) {
              if (result && result[ssb.id]) {
                // they follow us, or someone that follows us!
                ssb.gossip.add(peer, 'friends')
              }
            })
          }
        })
      })
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
    liveBacklinks: LiveBacklinks(ssb, config)
  }
}
