var Value = require('@mmckegg/mutant/value')
var computed = require('@mmckegg/mutant/computed')
var MutantDict = require('@mmckegg/mutant/dict')
var MutantStruct = require('@mmckegg/mutant/struct')

module.exports = function InfoCache () {
  var likesLookup = {}
  var channelsLookup = MutantDict()

  var channels = computed(channelsLookup, (lookup) => {
    var values = Object.keys(lookup).map(x => lookup[x]).sort((a, b) => b.updatedAt - a.updatedAt)
    return values
  }, {nextTick: true})

  return { getLikes, channels, updateFrom }

  function getLikes (msgId) {
    if (!likesLookup[msgId]) {
      likesLookup[msgId] = Value({})
    }
    return likesLookup[msgId]
  }

  function updateFrom (msg) {
    if (msg.key && msg.value && msg.value.content) {
      var c = msg.value.content
      if (c.type === 'vote') {
        if (msg.value.content.vote && msg.value.content.vote.link) {
          var likes = getLikes(msg.value.content.vote.link)()
          if (!likes[msg.value.author] || likes[msg.value.author][1] < msg.timestamp) {
            likes[msg.value.author] = [msg.value.content.vote.value > 0, msg.timestamp]
            getLikes(msg.value.content.vote.link).set(likes)
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
