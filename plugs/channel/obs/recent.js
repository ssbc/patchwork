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
        pull.drain(msg => {
          if (!sync()) {
            channelsLookup.transaction(() => {
              for (var channel in msg) {
                var obs = ChannelRef(channel)
                obs.set({
                  id: channel,
                  updatedAt: msg[channel].timestamp,
                  count: msg[channel].count
                })
                channelsLookup.put(channel, obs)
              }
              sync.set(true)
            })
          } else {
            var obs = channelsLookup.get(msg.channel)
            if (!obs) {
              obs = ChannelRef(msg.dest)
              channelsLookup.put(msg.dest, obs)
            }
            obs.set({
              id: msg.channel,
              updatedAt: Math.max(resolve(obs.updatedAt), msg.timestamp),
              count: resolve(obs.count) + 1
            })
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
