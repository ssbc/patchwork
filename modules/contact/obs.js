'use strict'

var nest = require('depnest')
var { computed } = require('mutant')
var MutantPullDict = require('../../lib/mutant-pull-dict')

exports.needs = nest({
  'sbot.pull.stream': 'first'
})

exports.gives = nest({
  'contact.obs': ['following', 'followers', 'blocking', 'blockers', 'hops', 'reverseHops']
})

exports.create = function (api) {
  var cache = {}
  var reverseCache = {}

  return nest('contact.obs', {
    following: (key) => matchingValueKeys(hops(key), 1),
    followers: (key) => matchingValueKeys(reverseHops(key), 1),
    blocking: (key) => matchingValueKeys(hops(key), -1),
    blockers: (key) => matchingValueKeys(reverseHops(key), -1),

    hops,
    reverseHops
  })

  function hops (feedId) {
    if (!cache[feedId]) {
      var obs = cache[feedId] = MutantPullDict(() => {
        return api.sbot.pull.stream((sbot) => sbot.patchwork.contacts.hopStream({ feedId, live: true, max: 1, old: true }))
      }, {
        onListen: () => { cache[feedId] = obs },
        onUnlisten: () => delete cache[feedId],
        sync: true
      })
    }
    return cache[feedId]
  }

  function reverseHops (feedId) {
    if (!reverseCache[feedId]) {
      var obs = reverseCache[feedId] = MutantPullDict(() => {
        return api.sbot.pull.stream((sbot) => sbot.patchwork.contacts.hopStream({ feedId, live: true, old: true, max: 1, reverse: true }))
      }, {
        onListen: () => { reverseCache[feedId] = obs },
        onUnlisten: () => delete reverseCache[feedId],
        sync: true
      })
    }
    return reverseCache[feedId]
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
