const pull = require('pull-stream')
const computed = require('mutant/computed')
const MutantPullReduce = require('mutant-pull-reduce')
const nest = require('depnest')
const ref = require('ssb-ref')

const throttle = require('mutant/throttle')

exports.needs = nest({
  'sbot.pull.userFeed': 'first',
  'channel.sync.normalize': 'first'
})

exports.gives = nest({
  'channel.obs.subscribed': true,
  'sbot.hook.publish': true
})

exports.create = function (api) {
  const cache = {}
  const reducers = {}

  return nest({
    'channel.obs.subscribed': subscribed,
    'sbot.hook.publish': function (msg) {
      if (isChannelSubscription(msg)) {
        if (msg.value.content.channel && reducers[msg.value.author]) {
          reducers[msg.value.author].push(msg)
        }
      }
    }
  })

  function subscribed (userId) {
    if (!ref.isFeed(userId)) throw new Error('a feed id must be specified')
    if (cache[userId]) {
      return cache[userId]
    } else {
      const stream = pull(
        api.sbot.pull.userFeed({ id: userId, live: true }),
        pull.filter((msg) => {
          return !msg.value || msg.value.content.type === 'channel'
        })
      )

      const latestTimestamps = {}

      const result = MutantPullReduce(stream, (result, msg) => {
        const c = msg.value.content
        if (c.type === 'channel' && typeof c.channel === 'string') {
          const channel = api.channel.sync.normalize(c.channel)
          if (channel && msg.value.timestamp > (latestTimestamps[channel] || 0)) {
            if (channel) {
              if (typeof c.subscribed === 'boolean') {
                latestTimestamps[channel] = msg.value.timestamp
                if (c.subscribed) {
                  result.add(channel)
                } else {
                  result.delete(channel)
                }
              }
            }
          }
        }
        return result
      }, {
        startValue: new Set(),
        nextTick: true
      })

      reducers[userId] = result

      const instance = throttle(result, 2000)
      instance.sync = result.sync

      instance.has = function (value) {
        return computed(instance, x => x.has(value))
      }

      cache[userId] = instance
      return instance
    }
  }
}

function isChannelSubscription (msg) {
  return msg.value && msg.value.content && msg.value.content.type === 'channel'
}
