// uses lib/flumeview-channels

var nest = require('depnest')
var pull = require('pull-stream')

var { Value, Dict, Struct, computed, resolve, throttle } = require('mutant')

exports.needs = nest({
  'sbot.pull.stream': 'first'
})

exports.gives = nest({
  'channel.obs.recent': true
})

exports.create = function (api) {
  var recentChannels = null
  var channelsLookup = null

  return nest({
    'channel.obs.recent': function () {
      load()
      return recentChannels
    }
  })

  function load () {
    if (!recentChannels) {
      var sync = Value(false)
      channelsLookup = Dict()

      pull(
        api.sbot.pull.stream(sbot => sbot.patchwork.channels({live: true})),
        pull.drain(data => {
          channelsLookup.transaction(() => {
            for (var channel in data) {
              var obs = channelsLookup.get(channel)
              if (!obs) {
                obs = ChannelRef(channel)
                channelsLookup.put(channel, obs)
              }
              var count = data[channel].count != null ? data[channel].count : obs.count() + 1
              var updatedAt = data[channel].timestamp
              obs.set({ id: channel, updatedAt, count })
            }
          })
          if (!sync()) {
            sync.set(true)
          }
        })
      )

      recentChannels = computed(throttle(channelsLookup, 1000), (lookup) => {
        var values = Object.keys(lookup).map(x => lookup[x]).sort((a, b) => b.updatedAt - a.updatedAt).map(x => x.id)
        return values
      })
      recentChannels.sync = sync
    }
  }
}

function ChannelRef (id) {
  return Struct({
    id,
    updatedAt: Value(0),
    count: Value(0)
  }, {merge: true})
}
