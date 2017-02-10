var Value = require('mutant/value')
var computed = require('mutant/computed')
var MutantDict = require('mutant/dict')
var MutantStruct = require('mutant/struct')

exports.gives = {
  cache: {
    update_from: true,
    get_likes: true,
    obs_channels: true
  }
}

exports.create = function (api) {
  var likesLookup = {}
  var channelsLookup = MutantDict()

  var obs_channels = computed(channelsLookup, (lookup) => {
    var values = Object.keys(lookup).map(x => lookup[x]).sort((a, b) => b.updatedAt - a.updatedAt)
    return values
  }, {nextTick: true})

  return {
    cache: {
      get_likes, obs_channels, update_from
    }
  }

  function get_likes (msgId) {
    if (!likesLookup[msgId]) {
      likesLookup[msgId] = Value({})
    }
    return likesLookup[msgId]
  }

  function update_from (msg) {
    if (msg.key && msg.value && msg.value.content) {
      var c = msg.value.content
      if (c.type === 'vote') {
        if (msg.value.content.vote && msg.value.content.vote.link) {
          var likes = get_likes(msg.value.content.vote.link)()
          if (!likes[msg.value.author] || likes[msg.value.author][1] < msg.timestamp) {
            likes[msg.value.author] = [msg.value.content.vote.value > 0, msg.timestamp]
            get_likes(msg.value.content.vote.link).set(likes)
          }
        }
      } else if (c.type === 'post' && typeof c.channel === 'string') {
        var name = c.channel.trim()
        if (name) {
          var channel = channelsLookup.get(name)
          if (!channel) {
            channel = MutantStruct({
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
  }
}
