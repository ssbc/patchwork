var pull = require('pull-stream')
var computed = require('mutant/computed')
var MutantPullReduce = require('../../../lib/mutant-pull-reduce')
var nest = require('depnest')

var throttle = require('mutant/throttle')

exports.needs = nest({
  'sbot.pull.userFeed': 'first'
})

exports.gives = nest({
  'channel.obs': ['subscribed']
})

exports.create = function (api) {
  var cache = {}

  return nest({
    'channel.obs': {subscribed}
  })

  function subscribed (userId) {
    if (cache[userId]) {
      return cache[userId]
    } else {
      var stream = pull(
        api.sbot.pull.userFeed({id: userId, live: true}),
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

      var instance = throttle(result, 2000)
      instance.sync = result.sync

      instance.has = function (value) {
        return computed(instance, x => x.has(value))
      }

      cache[userId] = instance
      return instance
    }
  }
}
