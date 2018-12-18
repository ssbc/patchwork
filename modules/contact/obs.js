'use strict'

var nest = require('depnest')
var { computed } = require('mutant')
var MutantPullDict = require('../../lib/mutant-pull-dict')

exports.needs = nest({
  'sbot.pull.stream': 'first'
})

exports.gives = nest({
  'contact.obs': ['following', 'followers', 'blocking', 'blockers', 'hops', 'reverseHops', 'ignores', 'statuses']
})

exports.create = function (api) {
  var cache = {}
  var statusCache = {}
  var reverseCache = {}
  var ignoreCache = null

  // currently only using reverseHops (not hops)
  // using statuses for following and blocking instead as this ignores private contact messages
  // we pull out the private blocks using "ignores" (for "listen" / "ignore" profile options)

  return nest('contact.obs', {
    following: (key) => matchingValueKeys(statuses(key), true),
    followers: (key) => matchingValueKeys(reverseHops(key), 1),
    blocking: (key) => matchingValueKeys(statuses(key), false),
    blockers: (key) => matchingValueKeys(reverseHops(key), -1),

    ignores,
    statuses,
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

  function statuses (feedId) {
    if (!statusCache[feedId]) {
      var obs = statusCache[feedId] = MutantPullDict(() => {
        return api.sbot.pull.stream((sbot) => sbot.patchwork.contacts.statusStream({ feedId, live: true }))
      }, {
        onListen: () => { statusCache[feedId] = obs },
        onUnlisten: () => delete statusCache[feedId],
        sync: true
      })
    }
    return statusCache[feedId]
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
