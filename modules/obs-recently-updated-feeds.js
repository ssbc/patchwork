var pull = require('pull-stream')
var pullCat = require('pull-cat')
var computed = require('mutant/computed')
var MutantPullReduce = require('../lib/mutant-pull-reduce')
var throttle = require('mutant/throttle')
var hr = 60 * 60 * 1000

exports.needs = {
  sbot: {
    log: 'first'
  }
}

exports.gives = {
  obs_recently_updated_feeds: true
}

exports.create = function (api) {
  return {
    obs_recently_updated_feeds (limit) {
      var stream = pull(
        pullCat([
          api.sbot.log({reverse: true, limit: limit || 500}),
          api.sbot.log({old: false})
        ])
      )

      var result = MutantPullReduce(stream, (result, msg) => {
        if (msg.value.timestamp && Date.now() - msg.value.timestamp < 24 * hr) {
          result.add(msg.value.author)
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

      return instance
    }
  }
}
