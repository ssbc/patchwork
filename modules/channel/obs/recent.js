var nest = require('depnest')
var pull = require('pull-stream')

var { Value, Dict, Struct, computed, resolve, throttle } = require('mutant')

exports.needs = nest({
  'sbot.pull.backlinks': 'first'
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
        api.sbot.pull.backlinks({
          old: false,
          live: true,
          query: [
            { $filter: {
              dest: { $prefix: '#' }
            } }
          ]
        }),
        pull.drain(msg => {
          var obs = channelsLookup.get(msg.dest)
          if (!obs) {
            obs = ChannelRef(msg.dest)
            channelsLookup.put(msg.dest, obs)
          }
          obs.set({
            id: msg.dest,
            updatedAt: Math.max(resolve(obs.updatedAt), msg.timestamp),
            count: resolve(obs.count) + 1
          })
        })
      )

      pull(
        api.sbot.pull.backlinks({
          query: [
            { $filter: {
              dest: { $prefix: '#' }
            } },
            { $reduce: {
              id: 'dest',
              updatedAt: { $max: 'timestamp' },
              count: { $count: true }
            } }
          ]
        }),
        pull.drain((item) => {
          if (item.sync) {
            sync.set(true)
          } else if (item.id && item.id.startsWith('#')) {
            var name = item.id
            var channel = channelsLookup.get(name)
            if (!channel) {
              channel = ChannelRef(name)
              channelsLookup.put(name, channel)
            }
            channel.set(item)
          }
        }, (err) => {
          if (err) throw err
          sync.set(true)
        })
      )
      recentChannels = computed(throttle(channelsLookup, 1000), (lookup) => {
        var values = Object.keys(lookup).map(x => lookup[x]).sort((a, b) => b.updatedAt - a.updatedAt).map(x => x.id.slice(1))
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
  }, { merge: true })
}
