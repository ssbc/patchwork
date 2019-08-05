var pull = require('pull-stream')

exports.manifest = {
  referencesStream: 'source',
  forksStream: 'source'
}

var excludeTypes = ['about', 'vote', 'tag']

exports.init = function (ssb) {
  return {
    referencesStream: function ({ id, since }) {
      return getBacklinksStream(id, since, (msg) => {
        if (msg.value && msg.value.content) {
          return msg.value.content.root !== id && msg.value.content.fork !== id && !includeOrEqual(msg.value.content.branch, id)
        }
      })
    },

    // don't call this for root messages, only replies
    forksStream: function ({ id, since }) {
      return getBacklinksStream(id, since, (msg) => {
        if (msg.value && msg.value.content) {
          return msg.value.content.root === id && includeOrEqual(msg.value.content.branch, id)
        }
      })
    }
  }

  function getBacklinksStream (id, since, fn) {
    return pull(
      ssb.backlinks.read({
        live: true,
        query: [{ $filter: {
          timestamp: { $gt: since || 0 },
          dest: id
        } }]
      }),
      pull.filter((msg) => {
        if (msg.sync) return true
        if (msg.value && msg.value.content && excludeTypes.includes(msg.value.content.type)) return false
        return fn(msg)
      }),
      pull.map((msg) => {
        if (msg.sync) return msg
        return { id: msg.key, author: msg.value.author, timestamp: msg.timestamp }
      })
    )
  }
}

function includeOrEqual (valueOrArray, item) {
  if (Array.isArray(valueOrArray)) {
    return valueOrArray.includes(item)
  } else {
    return valueOrArray === item
  }
}
