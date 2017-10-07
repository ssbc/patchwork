var FlumeReduce = require('flumeview-reduce')
var normalizeChannel = require('../lib/normalize-channel')

module.exports = function (ssb, config) {
  return ssb._flumeUse('patchwork-channels', FlumeReduce(1, reduce, map))
}

function isActivityMessage(msg) {
  var isVote = msg.value.content.type === "vote";

  return !isVote && msg.value.content.subscribed !== false
    && msg.value.content.subscribed !== true;
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

      // We don't update the timestamp if the messsage was just somebody subscribing
      // or unsubscribing from the channel, or it is a vote as we don't want it to register as
      // 'recent activity'.
      if (item[channel].isActivityMessage && item[channel].timestamp > value.timestamp) {
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
        [channel]: {timestamp: msg.timestamp, isActivityMessage: isActivityMessage(msg) }
      }
    }
  }
}
