const computed = require('mutant/computed')
const nest = require('depnest')

exports.needs = nest({
  'keys.sync.id': 'first',
  'contact.obs': {
    followers: 'first',
    following: 'first',
    blockers: 'first',
    blocking: 'first',
    ignores: 'first'
  }
})

exports.gives = nest('profile.obs.contact')

exports.create = function (api) {
  return nest('profile.obs.contact', function (id) {
    const yourId = api.keys.sync.id()
    const yourFollowing = api.contact.obs.following(yourId)
    const yourFollowers = api.contact.obs.followers(yourId)
    const yourBlocking = api.contact.obs.blocking(yourId)

    const followers = api.contact.obs.followers(id)
    const following = api.contact.obs.following(id)

    const sync = computed([followers.sync, following.sync, yourFollowing.sync, yourFollowers.sync], (...x) => x.every(Boolean))

    const blockers = api.contact.obs.blockers(id)
    const ignores = api.contact.obs.ignores()

    // allow override of block status if explicit ignore state set
    const youBlock = computed([yourBlocking], function (yourBlocking) {
      return yourBlocking.includes(id)
    })

    const hidden = computed([blockers, ignores], function (blockers, ignores) {
      return ignores[id] == null ? blockers.includes(yourId) : ignores[id]
    })

    // allow override of block status if explicit ignore state set
    const youIgnore = computed([blockers, ignores], function (blockers, ignores) {
      return ignores[id] === true
    })

    const youFollow = computed([yourFollowing], function (yourFollowing) {
      return yourFollowing.includes(id)
    })

    const yourFriends = computed([yourFollowers, yourFollowing], inAllSets)

    const blockingFriends = computed([yourFollowers, yourFollowing, blockers], inAllSets)
    const mutualFriends = computed([yourFollowers, yourFollowing, followers, following], inAllSets)
    const outgoingVia = computed([yourFollowers, following], inAllSets)
    const incomingVia = computed([yourFollowing, followers], inAllSets)

    const hasOutgoing = computed([yourFollowers, following], (a, b) => {
      return a.some((id) => b.includes(id))
    })
    const hasIncoming = computed([followers, yourFollowing], (a, b) => {
      return a.some((id) => b.includes(id))
    })

    const isYou = computed([yourId, id], (a, b) => a === b)

    const isNotFollowingAnybody = computed([following, following.sync], (following, sync) => {
      return sync && (!following || !following.length)
    })

    const hasNoFollowers = computed([followers, followers.sync], (followers, sync) => {
      return sync && (!followers || !followers.length)
    })

    return {
      followers,
      following,
      blockers,
      blockingFriends,
      blockingFriendsCount: count(blockingFriends),
      mutualFriends,
      mutualFriendsCount: count(mutualFriends),
      outgoingVia,
      outgoingViaCount: count(outgoingVia),
      incomingVia,
      incomingViaCount: count(incomingVia),
      hasOutgoing,
      isNotFollowingAnybody,
      hasNoFollowers,
      noOutgoing: not(hasOutgoing, isYou),
      hasIncoming,
      noIncoming: not(hasIncoming, isYou),
      yourId,
      yourFollowing,
      yourFollowers,
      yourFriends,
      youFollow,
      youBlock,
      youIgnore,
      hidden,
      isYou,
      notFollowing: not(youFollow, isYou),
      sync
    }
  })
}

function inAllSets (first, ...rest) {
  return first.filter(value => rest.every((collection) => collection.includes(value)))
}

function not (obs, isFalse) {
  return computed([obs, isFalse], (x, isFalse) => isFalse ? false : !x)
}

function count (obs) {
  return computed(obs, (x) => x.length)
}
