var pull = require('pull-stream')
var pullCat = require('pull-cat')
var computed = require('mutant/computed')
var MutantPullReduce = require('mutant-pull-reduce')
var throttle = require('mutant/throttle')
var nest = require('depnest')
var hr = 60 * 60 * 1000

exports.gives = nest('feed.obs.recent')

exports.needs = nest({
  'sbot.pull.log': 'first',
  'message.sync.timestamp': 'first'
})

exports.create = function (api) {
  return nest('feed.obs.recent', function (limit) {
    var stream = pull(
      pullCat([
        api.sbot.pull.log({reverse: true, limit: limit || 50}),
        api.sbot.pull.log({old: false})
      ])
    )

    var result = MutantPullReduce(stream, (result, msg) => {
      if (api.message.sync.timestamp(msg) && Date.now() - api.message.sync.timestamp(msg) < 24 * hr) {
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
  })
}
