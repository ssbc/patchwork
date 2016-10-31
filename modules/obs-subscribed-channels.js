var pull = require('pull-stream')
var computed = require('@mmckegg/mutant/computed')
var MutantPullReduce = require('../lib/mutant-pull-reduce')
var plugs = require('patchbay/plugs')
var sbot_user_feed = plugs.first(exports.sbot_user_feed = [])
var cache = {}

exports.obs_subscribed_channels = function (userId) {
  if (cache[userId]) {
    return cache[userId]
  } else {
    var stream = pull(
      sbot_user_feed({id: userId, live: true}),
      pull.filter((msg) => {
        return !msg.value || msg.value.content.type === 'channel'
      })
    )

    var result = MutantPullReduce(stream, (result, msg) => {
      var c = msg.value.content
      if (typeof c.channel === 'string' && c.channel) {
        var channel = c.channel.trim()
        if (channel) {
          if (typeof c.subscribed === 'boolean') {
            if (c.subscribed) {
              result.add(channel)
            } else {
              result.delete(channel)
            }
          }
        }
      }
      return result
    }, {
      startValue: new Set(),
      nextTick: true
    })

    result.has = function (value) {
      return computed(result, x => x.has(value))
    }

    cache[userId] = result
    return result
  }

}
