var Channels = require('./channels')
var Heartbeat = require('./heartbeat')
var Subscriptions = require('./subscriptions')
var Progress = require('./progress')
var Search = require('./search')
var RecentFeeds = require('./recent-feeds')
var LiveBacklinks = require('./live-backlinks')
var Likes = require('./likes')
var Backlinks = require('./backlinks')
var Profile = require('./profile')
var PublicFeed = require('./public-feed')
var Subscriptions2 = require('./subscriptions2')
var Thread = require('./thread')
var PrivateFeed = require('./private-feed')
var MentionsFeed = require('./mentions-feed')
var Gatherings = require('./gatherings')
var NetworkFeed = require('./network-feed')
var ChannelFeed = require('./channel-feed')

var pull = require('pull-stream')
var ref = require('ssb-ref')

exports.name = 'patchwork'
exports.version = require('../package.json').version
exports.manifest = {
  likes: Likes.manifest,
  backlinks: Backlinks.manifest,
  profile: Profile.manifest,
  publicFeed: PublicFeed.manifest,
  subscriptions2: Subscriptions2.manifest,
  thread: Thread.manifest,
  privateFeed: PrivateFeed.manifest,
  mentionsFeed: MentionsFeed.manifest,
  gatherings: Gatherings.manifest,
  networkFeed: NetworkFeed.manifest,
  channelFeed: ChannelFeed.manifest,
  channels: Channels.manifest,

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

  return {
    likes: Likes.init(ssb, config),
    backlinks: Backlinks.init(ssb, config),
    profile: Profile.init(ssb, config),
    publicFeed: PublicFeed.init(ssb, config),
    subscriptions2: Subscriptions2.init(ssb, config),
    thread: Thread.init(ssb, config),
    privateFeed: PrivateFeed.init(ssb, config),
    mentionsFeed: MentionsFeed.init(ssb, config),
    gatherings: Gatherings.init(ssb, config),
    networkFeed: NetworkFeed.init(ssb, config),
    channelFeed: ChannelFeed.init(ssb, config),
    channels: Channels.init(ssb, config),

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
}
