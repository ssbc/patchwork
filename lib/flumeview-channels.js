var FlumeReduce = require('flumeview-reduce')

exports.name = 'channels'
exports.version = require('../package.json').version
exports.manifest = {
  stream: 'source',
  get: 'async'
}

exports.init = function (ssb, config) {
  return ssb._flumeUse('channels', FlumeReduce(1, reduce, map))
}

function reduce (result, item) {
  if (!result) result = {}
  if (item) {
    var value = result[item.channel]
    if (!value) {
      value = result[item.channel] = {count: 0, timestamp: 0}
    }
    value.count += 1
    if (item.timestamp > value.timestamp) {
      value.timestamp = item.timestamp
    }
  }
  return result
}

function map (msg) {
  if (msg.value.content && typeof msg.value.content.channel === 'string') {
    var channel = msg.value.content.channel
    if (channel.length > 0 && channel.length < 30) {
      return {
        channel: channel.replace(/\s/g, ''),
        timestamp: msg.timestamp
      }
    }
  }
}
