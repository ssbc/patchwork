const pull = require('pull-stream')
const pullCat = require('pull-cat')
const computed = require('mutant/computed')
const MutantPullReduce = require('mutant-pull-reduce')
const throttle = require('mutant/throttle')
const nest = require('depnest')
const hr = 60 * 60 * 1000

exports.gives = nest('feed.obs.recent')

exports.needs = nest({
  'sbot.pull.log': 'first',
  'message.sync.timestamp': 'first'
})

exports.create = function (api) {
  return nest('feed.obs.recent', function (limit) {
    const stream = pull(
      pullCat([
        api.sbot.pull.log({ reverse: true, limit: limit || 50 }),
        api.sbot.pull.log({ old: false })
      ])
    )

    const result = MutantPullReduce(stream, (result, msg) => {
      if (api.message.sync.timestamp(msg) && Date.now() - api.message.sync.timestamp(msg) < 24 * hr) {
        result.add(msg.value.author)
      }
      return result
    }, {
      startValue: new Set(),
      nextTick: true
    })

    const instance = throttle(result, 2000)
    instance.sync = result.sync

    instance.has = function (value) {
      return computed(instance, x => x.has(value))
    }

    return instance
  })
}
