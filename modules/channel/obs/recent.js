var nest = require('depnest')
var { Value, Dict, Struct, computed } = require('mutant')

exports.gives = nest({
  'sbot.hook.feed': true,
  'channel.obs.recent': true
})

exports.create = function (api) {
  var channelsLookup = Dict()

  var recentChannels = computed(channelsLookup, (lookup) => {
    var values = Object.keys(lookup).map(x => lookup[x]).sort((a, b) => b.updatedAt - a.updatedAt)
    return values
  }, {nextTick: true})

  return nest({
    'sbot.hook.feed': (msg) => {
      if (msg.key && msg.value && msg.value.content) {
        var c = msg.value.content
        if (c.type === 'post' && typeof c.channel === 'string') {
          var name = c.channel.trim()
          if (name) {
            var channel = channelsLookup.get(name)
            if (!channel) {
              channel = Struct({
                id: name,
                updatedAt: Value()
              })
              channelsLookup.put(name, channel)
            }
            if (channel.updatedAt() < msg.timestamp) {
              channel.updatedAt.set(msg.timestamp)
            }
          }
        }
      }
    },
    'channel.obs.recent': () => recentChannels
  })
}
