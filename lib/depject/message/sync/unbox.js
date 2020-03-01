const ssbKeys = require('ssb-keys')
const nest = require('depnest')

exports.needs = nest({
  'keys.sync.load': 'first'
})

exports.gives = nest('message.sync.unbox')

exports.create = function (api) {
  return nest('message.sync.unbox', function (msg) {
    if (msg.value) {
      const value = unboxValue(msg.value)
      if (value) {
        return {
          key: msg.key, value: value, timestamp: msg.timestamp
        }
      }
    } else {
      return unboxValue(msg)
    }
  })

  function unboxValue (msg) {
    const plaintext = ssbKeys.unbox(msg.content, api.keys.sync.load())
    if (!plaintext) return null
    return {
      previous: msg.previous,
      author: msg.author,
      sequence: msg.sequence,
      timestamp: msg.timestamp,
      hash: msg.hash,
      content: plaintext,
      private: true
    }
  }
}
