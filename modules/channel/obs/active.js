// uses lib/flumeview-channels

var nest = require('depnest')
var pull = require('pull-stream')

var { Value, Dict, Struct, computed, throttle } = require('mutant')

exports.needs = nest({
  'sbot.pull.stream': 'first'
})

exports.gives = nest({
  'channel.obs.mostActive': true
})

exports.create = function (api) {
  var mostActiveChannels = null
  var channelsLookup = null
  var sync = Value(false)

  return nest({
    'channel.obs.mostActive': function () {
      load()
      return mostActiveChannels
    }
  })

  function subscribe () {
    pull(
      api.sbot.pull.stream(sbot => sbot.patchwork.channels.stream({ live: true })),
      pull.drain(data => {
        channelsLookup.transaction(() => {
          for (var channel in data) {
            var obs = channelsLookup.get(channel)
            if (!obs) {
              obs = Value({ count: 0 })
              channelsLookup.put(channel, obs)
            }
            var count = data[channel].count != null ? data[channel].count : obs().count + 1
            var updatedAt = data[channel].timestamp
            obs.set({ id: channel, updatedAt, count })
          }
        })
        if (!sync()) {
          sync.set(true)
        }
      })
    )
  }

  function load () {
    if (!mostActiveChannels) {
      channelsLookup = Dict()

      subscribe()

      mostActiveChannels = computed(throttle(channelsLookup, 1000), (lookup) => {
        var values = Object.keys(lookup).map(x => lookup[x]).sort((a, b) => b.count - a.count).map(x => [x.id, x.count])
        return values
      })
    }
  }
}

function ChannelRef (id) {
  return Struct({
    id,
    updatedAt: Value(0),
    count: Value(0)
  }, { merge: true })
}
