var Value = require('@mmckegg/mutant/value')

module.exports = function LikeCache () {
  var lookup = {}

  return { get, updateFrom }

  function get (msgId) {
    if (!lookup[msgId]) {
      lookup[msgId] = Value({})
    }
    return lookup[msgId]
  }

  function updateFrom (msg) {
    if (msg.key && msg.value && msg.value.content && msg.value.content.type === 'vote') {
      if (msg.value.content.vote && msg.value.content.vote.link) {
        var likes = get(msg.value.content.vote.link)()
        if (!likes[msg.value.author] || likes[msg.value.author][1] < msg.timestamp) {
          likes[msg.value.author] = [msg.value.content.vote.value > 0, msg.timestamp]
          get(msg.value.content.vote.link).set(likes)
        }
      }
    }
  }
}
