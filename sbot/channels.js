var FlumeReduce = require('flumeview-reduce')
var normalizeChannel = require('../lib/normalize-channel')

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
    var channel = normalizeChannel(msg.value.content.channel)
    if (channel) {
      return {
        [channel]: {timestamp: msg.timestamp}
      }
    }
  }
}
