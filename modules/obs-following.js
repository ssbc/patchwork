var pull = require('pull-stream')
var computed = require('mutant/computed')
var MutantPullReduce = require('../lib/mutant-pull-reduce')
var throttle = require('mutant/throttle')

exports.needs = {
  sbot: {
    user_feed: 'first'
  }
}

exports.gives = {
  obs_following: true
}

exports.create = function (api) {
  var cache = {}

  return {
    obs_following (userId) {
      if (cache[userId]) {
        return cache[userId]
      } else {
        var stream = pull(
          api.sbot.user_feed({id: userId, live: true}),
          pull.filter((msg) => {
            return !msg.value || msg.value.content.type === 'contact'
          })
        )

        var result = MutantPullReduce(stream, (result, msg) => {
          var c = msg.value.content
          if (c.contact) {
            if (typeof c.following === 'boolean') {
              if (c.following) {
                result.add(c.contact)
              } else {
                result.delete(c.contact)
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
}
