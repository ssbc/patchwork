var Channels = require('./channels')
var Subscriptions = require('./subscriptions')
var Roots = require('./roots')
var Progress = require('./progress')
var Search = require('./search')
var RecentFeeds = require('./recent-feeds')
var LiveBacklinks = require('./live-backlinks')

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

  return {
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
