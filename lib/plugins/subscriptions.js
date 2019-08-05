const FlumeReduce = require('flumeview-reduce')
const normalizeChannel = require('ssb-ref').normalizeChannel
const FlatMap = require('pull-flatmap')
const pull = require('pull-stream')

module.exports = function (ssb) {
  const index = ssb._flumeUse('patchwork-subscriptions', FlumeReduce(3, reduce, map))
  return {
    stream: function (opts) {
      const channel = normalizeChannel(opts.channel)
      return pull(
        index.stream({ live: opts.live }),
        FlatMap(items => {
          const result = []

          if (items) {
            Object.keys(items).forEach(key => {
              const parts = getParts(key)
              if (parts && (!channel || parts[1] === channel)) {
                result.push({ from: parts[0], to: parts[1], value: items[key][1], ts: items[key][0] })
              }
            })
          }

          return result
        })
      )
    },
    get: index.get
  }
}

function reduce (result, item) {
  if (!result) result = {}
  if (item) {
    for (const key in item) {
      if (!result[key] || result[key][0] < item[key][0]) {
        result[key] = item[key]
      }
    }
  }
  return result
}

function getParts (value) {
  const splitIndex = value.indexOf(':')
  if (splitIndex > 50) { // HACK: yup
    return [value.slice(0, splitIndex), value.slice(splitIndex + 1)]
  }
}

function map (msg) {
  if (msg.value.content && msg.value.content.type === 'channel') {
    if (typeof msg.value.content.subscribed === 'boolean') {
      const channel = normalizeChannel(msg.value.content.channel)
      if (channel) {
        const key = `${msg.value.author}:${channel}`
        return {
          [key]: [msg.timestamp, msg.value.content.subscribed]
        }
      }
    }
  }
}
