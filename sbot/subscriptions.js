var FlumeReduce = require('flumeview-reduce')
var normalizeChannel = require('../lib/normalize-channel')

module.exports = function (ssb, config) {
  return ssb._flumeUse('patchwork-subscriptions', FlumeReduce(3, reduce, map))
}

function reduce (result, item) {
  if (!result) result = {}
  if (item) {
    for (var key in item) {
      if (!result[key] || result[key][0] < item[key][0]) {
        result[key] = item[key]
      }
    }
  }
  return result
}

function map (msg) {
  if (msg.value.content && msg.value.content.type === 'channel') {
    if (typeof msg.value.content.subscribed === 'boolean') {
      var channel = normalizeChannel(msg.value.content.channel)
      if (channel) {
        var key = `${msg.value.author}:${channel}`
        return {
          [key]: [msg.timestamp, msg.value.content.subscribed]
        }
      }
    }
  }
}
