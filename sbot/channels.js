var FlumeReduce = require('flumeview-reduce')
var normalizeChannel = require('ssb-ref').normalizeChannel

module.exports = function (ssb, config) {
  return ssb._flumeUse('patchwork-channels', FlumeReduce(1, reduce, map))
}

function reduce (result, item) {
  if (!result) result = {}
  if (item) {
    for (var channel in item) {
      var value = result[channel]
      if (!value) {
        value = result[channel] = {count: 0, timestamp: 0}
      }
      value.count += 1

      if (item[channel].timestamp > value.timestamp) {
        value.timestamp = item[channel].timestamp
      }
    }
  }
  return result
}

function map (msg) {
  if (msg.value.content) {
    // filter out likes and subscriptions
    var isLike = msg.value.content.type === 'vote'
    var isSubscription = msg.value.content.type === 'channel'

    if (!isLike && !isSubscription) {
      var channels = getChannels(msg)
      if (channels.length) {
        return channels.reduce((result, channel) => {
          result[channel] = {timestamp: msg.timestamp}
          return result
        }, {})
      }
    }
  }
}

function getChannels (msg) {
  var result = []
  if (msg.value && msg.value.content) {
    var channel = normalizeChannel(msg.value.content.channel)
    if (channel) {
      result.push(channel)
    }
    if (Array.isArray(msg.value.content.mentions)) {
      msg.value.content.mentions.forEach(mention => {
        if (typeof mention.link === 'string' && mention.link.startsWith('#')) {
          var tag = normalizeChannel(mention.link.slice(1))
          if (tag) {
            result.push(tag)
          }
        }
      })
    }
  }
  return result
}
