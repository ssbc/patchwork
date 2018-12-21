'use strict'

var nest = require('depnest')
var { computed } = require('mutant')
var MutantPullDict = require('../../lib/mutant-pull-dict')

exports.needs = nest({
  'sbot.pull.stream': 'first'
})

exports.gives = nest({
  'contact.obs': ['following', 'followers', 'blocking', 'blockers', 'states', 'reverseStates', 'ignores']
})

exports.create = function (api) {
  var cache = {}
  var reverseCache = {}
  var ignoreCache = null

  return nest('contact.obs', {
    following: (key) => matchingValueKeys(states(key), true),
    followers: (key) => matchingValueKeys(reverseStates(key), true),
    blocking: (key) => matchingValueKeys(states(key), false),
    blockers: (key) => matchingValueKeys(reverseStates(key), false),

    ignores,
    states,
    reverseStates
  })

  function states (feedId) {
    if (!cache[feedId]) {
      var obs = cache[feedId] = MutantPullDict(() => {
        return api.sbot.pull.stream((sbot) => sbot.patchwork.contacts.stateStream({ feedId, live: true }))
      }, {
        onListen: () => { cache[feedId] = obs },
        onUnlisten: () => delete cache[feedId],
        sync: true
      })
    }
    return cache[feedId]
  }

  function reverseStates (feedId) {
    if (!reverseCache[feedId]) {
      var obs = reverseCache[feedId] = MutantPullDict(() => {
        return api.sbot.pull.stream((sbot) => sbot.patchwork.contacts.stateStream({ feedId, live: true, reverse: true }))
      }, {
        onListen: () => { reverseCache[feedId] = obs },
        onUnlisten: () => delete reverseCache[feedId],
        sync: true
      })
    }
    return reverseCache[feedId]
  }

  function ignores () {
    if (!ignoreCache) {
      var obs = ignoreCache = MutantPullDict(() => {
        return api.sbot.pull.stream((sbot) => sbot.patchwork.contacts.ignoreStream({ live: true }))
      }, {
        onListen: () => { ignoreCache = obs },
        onUnlisten: () => { ignoreCache = null },
        sync: true
      })
    }
    return ignoreCache
  }

  function matchingValueKeys (state, value) {
    var obs = computed(state, state => {
      return Object.keys(state).filter(key => {
        return state[key] === value
      })
    })

    obs.sync = state.sync
    return obs
  }
}
