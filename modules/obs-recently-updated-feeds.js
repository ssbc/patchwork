var pull = require('pull-stream')
var pullCat = require('pull-cat')
var computed = require('@mmckegg/mutant/computed')
var MutantPullReduce = require('../lib/mutant-pull-reduce')
var plugs = require('patchbay/plugs')
var sbot_log = plugs.first(exports.sbot_log = [])
var throttle = require('@mmckegg/mutant/throttle')
var hr = 60 * 60 * 1000

exports.obs_recently_updated_feeds = function (limit) {
  var stream = pull(
    pullCat([
      sbot_log({reverse: true, limit: limit || 500}),
      sbot_log({old: false})
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
