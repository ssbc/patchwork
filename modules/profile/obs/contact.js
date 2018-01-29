var computed = require('mutant/computed')
var nest = require('depnest')

exports.needs = nest({
  'keys.sync.id': 'first',
  'contact.obs': {
    followers: 'first',
    following: 'first',
    blockers: 'first'
  }
})

exports.gives = nest('profile.obs.contact')

exports.create = function (api) {
  return nest('profile.obs.contact', function (id) {
    var yourId = api.keys.sync.id()
    var yourFollowing = api.contact.obs.following(yourId)
    var yourFollowers = api.contact.obs.followers(yourId)

    var followers = api.contact.obs.followers(id)
    var following = api.contact.obs.following(id)
    var sync = computed([followers.sync, following.sync], (...x) => x.every(Boolean))

    var blockers = api.contact.obs.blockers(id)
    var youBlock = computed(blockers, function (blockers) {
      return blockers.includes(yourId)
    })

    var youFollow = computed([yourFollowing], function (yourFollowing) {
      return yourFollowing.includes(id)
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

    var isYou = computed([yourId, id], (a, b) => a === b)

    var isNotFollowingAnybody = computed(following, followingList => {
      return !followingList || !followingList.length
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
      noOutgoing: not(hasOutgoing, isYou),
      hasIncoming,
      noIncoming: not(hasIncoming, isYou),
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
