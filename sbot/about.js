var pull = require('pull-stream')
var ref = require('ssb-ref')
var Defer = require('pull-defer')

exports.manifest = {
  read: 'source',

  socialValueStream: 'source', // get the final value (based on authorId and yourId)
  socialValuesStream: 'source', // get all values known in your network
  latestValueStream: 'source', // latest value set in your network
  valueFromStream: 'source', // get value from author with `id`

  socialValue: 'async',
  latestValue: 'async',
  socialValues: 'async',
  latestValues: 'async' // get about values of chosen keys
}

exports.init = function (ssb, config) {
  return {

    // streams
    read,
    socialValueStream: function ({key, dest}) {
      var stream = Defer.source()
      getAuthor(key, (err, authorId) => {
        // fallback to dest if we don't have the message being described
        if (err || !authorId) authorId = dest

        var values = {}
        stream.resolve(pull(
          socialValuesStream({ key, dest }),
          pull.map((item) => {
            Object.keys(item).forEach(author => {
              if (item[author] && item[author].remove) {
                delete values[author]
              } else {
                values[author] = item[author]
              }
            })
            return getSocialValue(values, ssb.id, authorId)
          })
        ))
      })
      return stream
    },
    valueFromStream: function ({key, dest, id}) {
      var values = {}
      return pull(
        socialValuesStream({ key, dest }),
        pull.map((item) => {
          Object.keys(item).forEach(author => {
            if (item[author] && item[author].remove) {
              delete values[author]
            } else {
              values[author] = item[author]
            }
          })
          return values[id]
        })
      )
    },
    latestValueStream,
    socialValuesStream,

    // getters
    socialValue: function ({key, dest, authorId}, cb) {
      socialValues({key, dest}, (err, values) => {
        if (err) return cb(err)
        cb(null, getSocialValue(values, ssb.id, authorId))
      })
    },
    latestValue,
    latestValues,
    socialValues
  }

  function socialValuesStream ({key, dest}) {
    var values = {}
    var sync = false
    return pull(
      read({ dest, live: true, old: true }),
      pull.map((msg) => {
        if (msg.sync) {
          var result = values
          values = null
          sync = true
          return result
        }

        if (msg.value.content[key]) {
          if (sync) {
            return { [msg.value.author]: msg.value.content[key] }
          } else {
            if (msg.value.content[key].remove) {
              delete values[msg.value.author]
            } else {
              values[msg.value.author] = msg.value.content[key]
            }
          }
        }
      }),
      pull.filter(isDefined)
    )
  }

  function latestValueStream ({key, dest}) {
    var values = {}
    var value = null
    var authors = []
    var sync = false
    return pull(
      read({ dest, live: true, old: true }),
      pull.map((msg) => {
        if (msg.sync) {
          sync = true
          return value
        }

        if (msg.value.content[key]) {
          if (msg.value.content[key] && msg.value.content[key].remove) {
            // this author wants to remove their set value (fall back to other values)
            removeItem(authors, msg.value.author)
            delete values[msg.value.author]
          } else {
            removeItem(authors, msg.value.author)
            authors.push(msg.value.author)
            values[msg.value.author] = msg.value.content[key]
          }

          if (authors.length) {
            value = values[authors[authors.length - 1]]
          }

          if (sync) {
            return value
          }
        }
      }),
      pull.filter(isDefined)
    )
  }

  function socialValues ({key, dest}, cb) {
    var values = {}
    pull(
      read({dest}),
      pull.drain(msg => {
        if (msg.value.content[key]) {
          values[msg.value.author] = msg.value.content[key]
        }
      }, (err) => {
        if (err) return cb(err)
        cb(null, values)
      })
    )
  }

  function latestValue ({key, dest}, cb) {
    var value = null
    pull(
      read({dest, reverse: true}),
      pull.filter(msg => {
        return msg.value.content && key in msg.value.content && !(msg.value.content[key] && msg.value.content[key].remove)
      }),
      pull.take(1),
      pull.drain(msg => {
        value = msg.value.content[key]
      }, (err) => {
        if (err) return cb(err)
        cb(null, value)
      })
    )
  }

  function latestValues ({keys, dest}, cb) {
    var values = {}
    pull(
      read({dest, reverse: true}),
      pull.drain(msg => {
        if (msg.value.content) {
          for (var key in msg.value.content) {
            if (keys.includes(key) && !(key in values) && !(msg.value.content[key] && msg.value.content[key].remove)) {
              values[key] = msg.value.content[key]
            }
          }
        }
      }, (err) => {
        if (err) return cb(err)
        cb(null, values)
      })
    )
  }

  function read ({reverse = false, limit, live, old, dest}) {
    return pull(
      ssb.backlinks.read({
        reverse,
        live,
        limit,
        query: [{$filter: {
          dest,
          value: {content: {type: 'about', about: dest}}
        }}]
      })
    )
  }

  function getAuthor (msgId, cb) {
    if (ref.isFeedId(msgId)) return cb(null, msgId)
    if (ref.isMsgId(msgId)) {
      ssb.get({id: msgId, raw: true}, (err, value) => {
        if (err) return cb(err)
        cb(null, value.author)
      })
    } else {
      return cb(null, null)
    }
  }
}

function getSocialValue (socialValues, yourId, authorId) {
  if (socialValues[socialValues]) {
    // you assigned a value, use this!
    return socialValues[socialValues]
  } else if (socialValues[authorId]) {
    // they assigned a name, use this!
    return socialValues[authorId]
  } else {
    // choose a value from selection based on most common
    return highestRank(socialValues)
  }
}

function highestRank (lookup) {
  var counts = {}
  var highestCount = 0
  var currentHighest = null
  for (var key in lookup) {
    var value = getValue(lookup[key])
    if (value != null) {
      counts[value] = (counts[value] || 0) + 1
      if (counts[value] > highestCount) {
        currentHighest = value
        highestCount = counts[value]
      }
    }
  }
  return currentHighest
}

function getValue (item) {
  if (typeof item === 'string') {
    return item
  } else if (item && item.link && ref.isLink(item.link) && !item.remove) {
    return item.link
  }
}

function isDefined (value) {
  return value !== undefined
}

function removeItem (array, item) {
  var index = array.indexOf(item)
  if (~index) {
    // remove existing author
    array.splice(index, 1)
  }
}
