var pull = require('pull-stream')
var ref = require('ssb-ref')
var Paramap = require('pull-paramap')
var pullCat = require('pull-cat')
var extend = require('xtend')

var collator = new Intl.Collator('default', { sensitivity: 'base', usage: 'search' })

exports.manifest = {
  profile: 'async'
}

exports.init = function (ssb, config) {
  var suggestCache = {}
  var updateQueue = new Set()
  var following = new Set()
  var recentFriends = []

  // start update loop after 5 seconds
  setTimeout(updateLoop, 5e3)
  setTimeout(watchRecent, 10e3)

  setTimeout(() => {
    // use the public friend states for suggestions (not private)
    // so that we can find friends that we can still find ignored friends (privately blocked)
    pull(
      ssb.patchwork.contacts.stateStream({ live: true, feedId: ssb.id }),
      pull.drain(states => {
        Object.keys(states).forEach(key => {
          if (states[key] === true) {
            following.add(key)
            updateQueue.add(key)
          } else {
            following.delete(key)
          }
        })
      })
    )
  }, 5)

  pull(
    ssb.backlinks.read({
      live: true,
      old: false,
      query: [{ $filter: {
        dest: { $prefix: '@' },
        value: { content: { type: 'about' } }
      } }]
    }),
    pull.filter(msg => {
      return msg.value && msg.value.content && ref.isFeedId(msg.value.content.about) && (typeof msg.value.content.name === 'string' || msg.value.content.image)
    }),
    pull.drain(msg => {
      updateQueue.add(msg.value.content.about)
    })
  )

  function updateLoop () {
    if (updateQueue.size) {
      var ids = Array.from(updateQueue)
      updateQueue.clear()
      update(ids, () => {
        if (updateQueue.size) {
          updateLoop()
        } else {
          setTimeout(updateLoop, 10e3)
        }
      })
    } else {
      setTimeout(updateLoop, 10e3)
    }
  }

  function watchRecent () {
    pull(
      pullCat([
        ssb.createLogStream({ reverse: true, limit: 100 }),
        ssb.createLogStream({ old: false })
      ]),
      pull.drain(msg => {
        if (!suggestCache[msg.value.author]) {
          updateQueue.add(msg.value.author)
        }

        // update recent friends
        if (following.has(msg.value.author)) {
          var index = recentFriends.indexOf(msg.value.author)
          if (~index) {
            recentFriends.splice(index, 1)
          }
          recentFriends.push(msg.value.author)
        }
      })
    )
  }

  function update (ids, cb) {
    if (Array.isArray(ids) && ids.length) {
      pull(
        pull.values(ids),
        Paramap((id, cb) => ssb.patchwork.profile.avatar({ id }, cb), 10),
        pull.drain(item => {
          suggestCache[item.id] = item
        }, cb)
      )
    } else {
      cb()
    }
  }

  return {
    profile: function ({ text, limit, defaultIds }, cb) {
      defaultIds = defaultIds || []
      update(defaultIds.filter(id => !suggestCache[id]), function (err) {
        if (err) return cb(err)
        if (typeof text === 'string' && text.trim().length) {
          let matches = getMatches(suggestCache, text)
          let result = sort(matches, defaultIds, recentFriends, following)
          if (limit) {
            result = result.slice(0, limit)
          }

          // add following attribute
          result = result.map(x => extend(x, { following: following.has(x.id) }))

          cb(null, result)
        } else if (defaultIds && defaultIds.length) {
          cb(null, defaultIds.map(id => suggestCache[id]))
        } else {
          let ids = recentFriends.slice(-(limit || 20)).reverse()
          let result = ids.map(id => suggestCache[id])
          result = result.map(x => extend(x, { following: following.has(x.id) }))
          cb(null, result)
        }
      })
    }
  }
}

function startsWith (text, startsWith) {
  return collator.compare(text.slice(0, startsWith.length), startsWith) === 0
}

function sort (items, defaultItems, recentFriends, following) {
  return items.sort((a, b) => {
    return compareBool(defaultItems.includes(a.id), defaultItems.includes(b.id)) ||
           compareBool(recentFriends.includes(a.id), recentFriends.includes(b.id)) ||
           compareBool(following.has(a.id), following.has(b.id)) ||
           a.name.length - b.name.length
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

function getMatches (cache, text) {
  var result = []
  var values = Object.values(cache)

  values.forEach((item) => {
    if (typeof item.name === 'string' && startsWith(item.name, text)) {
      result.push(item)
    }
  })
  return result
}
