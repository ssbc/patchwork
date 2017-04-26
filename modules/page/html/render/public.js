var nest = require('depnest')
var { h, when, computed } = require('mutant')
var extend = require('xtend')
var pull = require('pull-stream')

exports.needs = nest({
  sbot: {
    pull: {
      log: 'first',
      feed: 'first',
      userFeed: 'first'
    }
  },

  'message.html.compose': 'first',

  'feed.html.rollup': 'first',
  'contact.obs.following': 'first',
  'channel.obs': {
    subscribed: 'first'
  },
  'keys.sync.id': 'first'
})

exports.gives = nest({
  'page.html.render': true
})

exports.create = function (api) {
  return nest('page.html.render', page)

  function page (path) {
    if (path !== '/public') return // "/" is a sigil for "page"

    var id = api.keys.sync.id()
    var following = api.contact.obs.following(id)
    var subscribedChannels = api.channel.obs.subscribed(id)

    var prepend = [
      api.message.html.compose({ meta: { type: 'post' }, placeholder: 'Write a public message' })
    ]

    var feedView = api.feed.html.rollup(getFeed, {
      prepend,
      waitFor: computed([
        following.sync,
        subscribedChannels.sync
      ], (...x) => x.every(Boolean)),
      windowSize: 1000,
      filter: (item) => {
        return !item.boxed && (item.lastUpdateType !== 'post' || item.message) && (
          id === item.author ||
          (item.author && following().has(item.author)) ||
          (item.type === 'message' && subscribedChannels().has(item.channel)) ||
          (item.type === 'subscribe' && item.subscribers.size) ||
          (item.repliesFrom && item.repliesFrom.has(id)) ||
          item.likes && item.likes.has(id)
        )
      },
      bumpFilter: (msg, group) => {
        if (group.type === 'subscribe') {
          removeStrangers(group.subscribers)
        }

        if (group.type === 'message') {
          removeStrangers(group.likes)
          removeStrangers(group.repliesFrom)

          if (!group.message) {
            // if message is old, only show replies from friends
            group.replies = group.replies.filter(x => {
              return (x.value.author === id || following().has(x.value.author))
            })
          }
        }

        if (!group.message) {
          return (
            isMentioned(id, msg.value.content.mentions) ||
            msg.value.author === id || (
              fromDay(msg, group.fromTime) && (
                following().has(msg.value.author) ||
                group.repliesFrom.has(id)
              )
            )
          )
        }
        return true
      }
    })

    var result = feedView

    result.pendingUpdates = feedView.pendingUpdates
    result.reload = feedView.reload

    return result

    function removeStrangers (set) {
      if (set) {
        Array.from(set).forEach(key => {
          if (!following().has(key) && key !== id) {
            set.delete(key)
          }
        })
      }
    }

    function getFeed (opts) {
      if (opts.lt) {
        opts = extend(opts, {lt: parseInt(opts.lt, 10)})
      }

      return pull(
        api.sbot.pull.feed(opts),
        pull.map((msg) => {
          if (msg.sync) return msg
          return {key: msg.key, value: msg.value, timestamp: msg.value.timestamp}
        })
      )
    }

    function getFirstMessage (feedId, cb) {
      api.sbot.pull.userFeed({id: feedId, gte: 0, limit: 1})(null, cb)
    }
  }
}

function isMentioned (id, list) {
  if (Array.isArray(list)) {
    return list.includes(id)
  } else {
    return false
  }
}

function fromDay (msg, fromTime) {
  return (fromTime - msg.timestamp) < (24 * 60 * 60e3)
}
