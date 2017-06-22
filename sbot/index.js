var Channels = require('./channels')
var Subscriptions = require('./subscriptions')
var Roots = require('./roots')
var Progress = require('./progress')

exports.name = 'patchwork'
exports.version = require('../package.json').version
exports.manifest = {
  channels: 'source',
  subscriptions: 'source',
  roots: 'source',
  latest: 'source',
  progress: 'source',
  getSubscriptions: 'async',
  getChannels: 'async'
}

exports.init = function (ssb, config) {
  var progress = Progress(ssb, config)
  var channels = Channels(ssb, config)
  var subscriptions = Subscriptions(ssb, config)
  var roots = Roots(ssb, config)

  return {
    channels: channels.stream,
    subscriptions: subscriptions.stream,
    roots: roots.read,
    latest: roots.latest,
    progress: progress.stream,

    getSubscriptions: subscriptions.get,
    getChannels: channels.get
  }
}
