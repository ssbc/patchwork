'use strict'

const nest = require('depnest')
const { computed } = require('mutant')
const MutantPullDict = require('../../mutant-pull-dict')

exports.needs = nest({
  'sbot.pull.stream': 'first'
})

exports.gives = nest({
  'contact.obs': ['following', 'followers', 'blocking', 'blockers', 'states', 'reverseStates', 'ignores']
})

exports.create = function (api) {
  const cache = {}
  const reverseCache = {}
  let ignoreCache = null

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
      cache[feedId] = MutantPullDict(() => {
        return api.sbot.pull.stream((sbot) => sbot.patchwork.contacts.stateStream({ feedId, live: true }))
      }, {
        sync: true
      })
    }
    return cache[feedId]
  }

  function reverseStates (feedId) {
    if (!reverseCache[feedId]) {
      reverseCache[feedId] = MutantPullDict(() => {
        return api.sbot.pull.stream((sbot) => sbot.patchwork.contacts.stateStream({ feedId, live: true, reverse: true }))
      }, {
        sync: true
      })
    }
    return reverseCache[feedId]
  }

  function ignores () {
    if (!ignoreCache) {
      ignoreCache = MutantPullDict(() => {
        return api.sbot.pull.stream((sbot) => sbot.patchwork.contacts.ignoreStream({ live: true }))
      }, {
        sync: true
      })
    }
    return ignoreCache
  }

  function matchingValueKeys (state, value) {
    const obs = computed(state, state => {
      return Object.keys(state).filter(key => {
        return state[key] === value
      })
    })

    obs.sync = state.sync
    return obs
  }
}
