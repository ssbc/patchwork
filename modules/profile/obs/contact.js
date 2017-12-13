var computed = require('mutant/computed')
var nest = require('depnest')

exports.needs = nest({
  'keys.sync.id': 'first',
  'contact.obs.rootId': 'first',
  'contact.obs.sameAs': 'first',
  'contact.obs': {
    followers: 'first',
    following: 'first',
    blockers: 'first'
  }
})

exports.gives = nest('profile.obs.contact')

exports.create = function (api) {
  return nest('profile.obs.contact', function (id) {
    var theirId = api.contact.obs.rootId(id)
    var yourId = api.contact.obs.rootId(api.keys.sync.id())
    var keys = api.contact.obs.sameAs(id)
    var yourFollowing = computed(yourId, api.contact.obs.following)
    var yourFollowers = computed(yourId, api.contact.obs.followers)

    var followers = computed(theirId, api.contact.obs.followers)
    var following = computed(theirId, api.contact.obs.following)
    var sync = computed([followers.sync, following.sync], (...x) => x.every(Boolean))

    var blockers = computed(theirId, api.contact.obs.blockers)
    var youBlock = computed([blockers, yourId], function (blockers, yourId) {
      return blockers.includes(yourId)
    })

    var youFollow = computed([yourFollowing, theirId], function (yourFollowing, theirId) {
      return yourFollowing.includes(theirId)
    })

    var blockingFriends = computed([yourFollowers, yourFollowing, blockers], inAllSets)
    var mutualFriends = computed([yourFollowers, yourFollowing, followers, following], inAllSets)
    var outgoingVia = computed([yourFollowers, following], inAllSets)
    var incomingVia = computed([yourFollowing, followers], inAllSets)

    var hasOutgoing = computed([yourFollowers, following], (a, b) => {
      return a.some((id) => b.includes(id))
    })
    var hasIncoming = computed([followers, yourFollowing], (a, b) => {
      return a.some((id) => b.includes(id))
    })

    var isYou = computed([yourId, theirId], (a, b) => a === b)

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
      noOutgoing: not(hasOutgoing, isYou),
      hasIncoming,
      noIncoming: not(hasIncoming, isYou),
      keys,
      theirId,
      yourId,
      yourFollowing,
      yourFollowers,
      youFollow,
      youBlock,
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
