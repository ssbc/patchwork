var FlumeReduce = require('flumeview-reduce')

module.exports = function (ssb, config) {
  return ssb._flumeUse('patchwork-subscriptions', FlumeReduce(1, reduce, map))
}

function reduce (result, item) {
  if (!result) result = []
  if (Array.isArray(item)) {
    for (var key in item) {
      if (!result[key] || result[key][0] < item[key][0]) {
        result[key] = item
      }
    }
  }
  return result
}

function map (msg) {
  if (msg.value.content && msg.value.content.type === 'channel') {
    if (typeof msg.value.content.channel === 'string' && typeof msg.value.content.subscribed === 'boolean') {
      var channel = msg.value.content.channel.replace(/\s/g, '')
      var key = `${msg.value.author}:${channel}`
      return [{
        [key]: [msg.timestamp, msg.value.content.subscribed]
      }]
    }
  }
}
