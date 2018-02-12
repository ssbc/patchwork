var FlumeReduce = require('flumeview-reduce')
var normalizeChannel = require('ssb-ref').normalizeChannel
var FlatMap = require('pull-flatmap')
var pull = require('pull-stream')

module.exports = function (ssb, config) {
  var index = ssb._flumeUse('patchwork-subscriptions', FlumeReduce(3, reduce, map))
  return {
    stream: function (opts) {
      var channel = normalizeChannel(opts.channel)
      return pull(
        index.stream({live: opts.live}),
        FlatMap(items => {
          var result = []

          if (items) {
            Object.keys(items).forEach(key => {
              var parts = getParts(key)
              if (parts && (!channel || parts[1] === channel)) {
                result.push({from: parts[0], to: parts[1], value: items[key][1], ts: items[key][0]})
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
    for (var key in item) {
      if (!result[key] || result[key][0] < item[key][0]) {
        result[key] = item[key]
      }
    }
  }
  return result
}

function getParts (value) {
  var splitIndex = value.indexOf(':')
  if (splitIndex > 50) { // HACK: yup
    return [value.slice(0, splitIndex), value.slice(splitIndex + 1)]
  }
}

function map (msg) {
  if (msg.value.content && msg.value.content.type === 'channel') {
    if (typeof msg.value.content.subscribed === 'boolean') {
      var channel = normalizeChannel(msg.value.content.channel)
      if (channel) {
        var key = `${msg.value.author}:${channel}`
        return {
          [key]: [msg.timestamp, msg.value.content.subscribed]
        }
      }
    }
  }
}
