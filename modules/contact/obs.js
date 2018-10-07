'use strict'

var nest = require('depnest')
var { Value, computed } = require('mutant')
var pull = require('pull-stream')
var ref = require('ssb-ref')

exports.needs = nest({
  'sbot.pull.stream': 'first'
})

exports.gives = nest({
  'contact.obs': ['following', 'followers', 'blocking', 'blockers', 'raw'],
  'sbot.hook.publish': true
})

exports.create = function (api) {
  var cacheLoading = false
  var cache = {}
  var reverseCache = {}

  var sync = Value(false)

  return nest({
    'contact.obs': {

      // states:
      //   true = following,
      //   null = neutral (may have unfollowed),
      //   false = blocking

      following: (key) => matchingValueKeys(get(key, cache), true),
      followers: (key) => matchingValueKeys(get(key, reverseCache), true),
      blocking: (key) => matchingValueKeys(get(key, cache), false),
      blockers: (key) => matchingValueKeys(get(key, reverseCache), false),
      raw: (key) => get(key, cache)
    },
    'sbot.hook.publish': function (msg) {
      if (!isContact(msg)) return

      // HACK: make interface more responsive when sbot is busy
      var source = msg.value.author
      var dest = msg.value.content.contact
      var tristate = ( // from ssb-friends
        msg.value.content.following ? true
          : msg.value.content.flagged || msg.value.content.blocking ? false
            : null
      )

      update(source, { [dest]: tristate }, cache)
      update(dest, { [source]: tristate }, reverseCache)
    }
  })

  function matchingValueKeys (state, value) {
    var obs = computed(state, state => {
      return Object.keys(state).filter(key => {
        return state[key] === value
      })
    })

    obs.sync = sync
    return obs
  }

  function loadCache () {
    pull(
      api.sbot.pull.stream(sbot => sbot.friends.stream({ live: true })),
      pull.drain(item => {
        if (!sync()) {
          // populate observable cache
          var reverse = {}
          for (var source in item) {
            if (ref.isFeed(source)) {
              update(source, item[source], cache)

              // generate reverse lookup
              for (let dest in item[source]) {
                reverse[dest] = reverse[dest] || {}
                reverse[dest][source] = item[source][dest]
              }
            }
          }

          // populate reverse observable cache
          for (let dest in reverse) {
            update(dest, reverse[dest], reverseCache)
          }

          sync.set(true)
        } else if (item && ref.isFeed(item.from) && ref.isFeed(item.to)) {
          // handle realtime updates
          update(item.from, { [item.to]: item.value }, cache)
          update(item.to, { [item.from]: item.value }, reverseCache)
        }
      })
    )
  }

  function update (sourceId, values, lookup) {
    // ssb-friends: values = {
    //   keyA: true|null|false (friend, neutral, block)
    //   keyB: true|null|false (friend, neutral, block)
    // }
    var state = get(sourceId, lookup)
    var lastState = state()
    var changed = false

    for (var targetId in values) {
      if (values[targetId] !== lastState[targetId]) {
        lastState[targetId] = values[targetId]
        changed = true
      }
    }

    if (changed) {
      state.set(lastState)
    }
  }

  function get (id, lookup) {
    if (!ref.isFeed(id)) throw new Error('Contact state requires an id!')
    if (!cacheLoading) {
      cacheLoading = true
      loadCache()
    }
    if (!lookup[id]) {
      lookup[id] = Value({})
    }
    return lookup[id]
  }
}

function isContact (msg) {
  return msg.value && msg.value.content && msg.value.content.type === 'contact'
}
