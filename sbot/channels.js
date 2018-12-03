var FlumeReduce = require('flumeview-reduce')
var normalizeChannel = require('ssb-ref').normalizeChannel
var PullPushable = require('pull-pushable')
var pull = require('pull-stream')
var sorted = require('sorted-array-functions')
var Abortable = require('pull-abortable')
var collator = new Intl.Collator('default', { sensitivity: 'base', usage: 'search' })

exports.manifest = {
  get: 'async',
  stream: 'source',
  suggest: 'async',
  recentStream: 'source'
}

exports.init = function (ssb, config) {
  var index = ssb._flumeUse('patchwork-channels', FlumeReduce(3, reduce, map))
  return {
    get: index.get,
    stream: index.stream,
    suggest: function ({ text, limit }, cb) {
      index.get((err, channels) => {
        if (err) return cb(err)
        ssb.patchwork.subscriptions2.get({ id: ssb.id }, (err, subscriptions) => {
          if (err) return cb(err)
          var result = []

          if (typeof text === 'string' && text.trim().length) {
            let matches = getMatches(channels, text)
            result = sort(matches, subscriptions)
          } else {
            // suggest subscribed channels by default, sorted by most recent posts
            for (var channel in subscriptions) {
              if (subscriptions[channel].subscribed) {
                result.push(channel)
              }
              result.sort((a, b) => {
                return (channels[b] && (channels[b].updatedAt || 0)) - (channels[a] && (channels[a].updatedAt || 0))
              })
            }
          }

          if (limit) {
            result = result.slice(0, limit)
          }

          // add subscribed and count attribute
          result = result.map(id => {
            return {
              id,
              subscribed: subscriptions[id] && subscriptions[id].subscribed,
              count: channels[id] && channels[id].count
            }
          })

          cb(null, result)
        })
      })
    },
    recentStream: function ({ limit = 10, throttle = 5e3 }) {
      var aborter = Abortable()
      var stream = PullPushable(() => {
        aborter.abort()
      })
      var sync = false
      var timer = null

      var lastUpdated = []

      pull(
        index.stream({ live: true }),
        aborter,
        pull.drain(data => {
          for (var channel in data) {
            var updatedAt = data[channel].timestamp
            if (sync) {
              // make sure there isn't a double up!
              var existingItemIndex = lastUpdated.findIndex(value => value[0] === channel)
              if (existingItemIndex >= 0) {
                lastUpdated.splice(existingItemIndex, 1)
              }
            }
            sorted.add(lastUpdated, [channel, updatedAt], mostRecent)
          }
          if (!sync) {
            sync = true
            sendLatest()
          } else {
            queueSend()
          }
        })
      )

      return stream

      function sendLatest () {
        // truncate list to speed up future updates (and save memory)
        lastUpdated.length = limit
        stream.push(lastUpdated.map(item => item[0]))
      }

      function queueSend () {
        clearTimeout(timer)
        timer = setTimeout(sendLatest, throttle || 5e3)
      }
    }
  }
}

function mostRecent (a, b) {
  return b[1] - a[1]
}

function reduce (result, item) {
  if (!result) result = {}
  if (item) {
    for (var channel in item) {
      var value = result[channel]
      if (!value) {
        value = result[channel] = { count: 0, timestamp: 0 }
      }
      value.count += 1

      if (item[channel].timestamp > value.timestamp) {
        value.timestamp = item[channel].timestamp
      }
    }
  }
  return result
}

function map (msg) {
  if (msg.value.content) {
    // filter out likes and subscriptions
    var isLike = msg.value.content.type === 'vote'
    var isSubscription = msg.value.content.type === 'channel'

    if (!isLike && !isSubscription) {
      var channels = getChannels(msg)
      if (channels.length) {
        return channels.reduce((result, channel) => {
          var timestamp = Math.min(msg.value.timestamp, msg.timestamp)
          result[channel] = { timestamp }
          return result
        }, {})
      }
    }
  }
}

function getChannels (msg) {
  var result = []
  if (msg.value && msg.value.content) {
    var channel = normalizeChannel(msg.value.content.channel)
    if (channel) {
      result.push(channel)
    }
    if (Array.isArray(msg.value.content.mentions) && msg.value.content.type === 'post') {
      msg.value.content.mentions.forEach(mention => {
        if (Object.keys(mention).length === 1 && typeof mention.link === 'string' && mention.link.startsWith('#')) {
          var tag = normalizeChannel(mention.link.slice(1))
          if (tag) {
            result.push(tag)
          }
        }
      })
    }
  }
  return result
}

function getMatches (channels, text) {
  var result = []

  for (var channel in channels) {
    if (startsWith(channel, text)) {
      result.push(channel)
    }
  }

  return result
}

function startsWith (text, startsWith) {
  return collator.compare(text.slice(0, startsWith.length), startsWith) === 0
}

function sort (items, subscribed) {
  return items.sort((a, b) => {
    return compareBool(subscribed[a] && subscribed[a].subscribed, subscribed[b] && subscribed[b].subscribed) ||
           a.length - b.length
  })
}

function compareBool (a, b) {
  if (a === b) {
    return 0
  } else if (a) {
    return -1
  } else {
    return 1
  }
}
