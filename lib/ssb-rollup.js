var SortedArray = require('sorted-array-functions')
var ref = require('ssb-ref')

module.exports = rollupMessages

function rollupMessages (messages, opts, cb) {
  var messageFilter = opts && opts.messageFilter || function (messages, cb) {
    cb(null, messages)
  }

  var compare = opts && opts.compare || function (a, b) {
    return messages.indexOf(last(a.bumps)) - messages.indexOf(last(b.bumps))
  }

  // Group by thread (for posts) and topic (for follows, subscribes)
  var grouped = groupByType(messages)

  // preserve original message ordering for thread ordering
  grouped.bumps = getThreadBumps(grouped, (a, b) => {
    return messages.indexOf(a) - messages.indexOf(b) || 0
  })

  // filter messages using provided function (remove non-friends, etc)
  messageFilter(grouped, function (err, grouped) {
    if (err) return cb(err)

    // sort groups by recent actions
    var result = []

    var rootIds = new Set(Object.keys(grouped.roots).concat(Object.keys(grouped.replies)))

    rootIds.forEach(rootId => {
      SortedArray.add(result, {
        type: 'thread',
        rootId,
        root: grouped.roots[rootId],
        replies: grouped.replies[rootId] || [], //
        likes: grouped.likes[rootId] || [],
        bumps: grouped.bumps[rootId] || []
      }, compare)
    })

    // For follows and subscribes, figure out optimised grouping (friends,
    // multiple channel subscriptions, users) and insert ordered
    insertContacts(result, grouped.contacts, compare)
    // insertChannels(grouped, result)

    cb(null, result)
  })
}

function getThreadBumps (grouped, compare) {
  var result = {}
  Object.keys(grouped.roots).forEach(key => {
    result[key] = [grouped.roots[key]]
  })

  Object.keys(grouped.replies).forEach(key => {
    var collection = result[key] = result[key] || []
    addThreadBumps(collection, grouped.replies[key], compare)
  })

  Object.keys(grouped.likes).forEach(key => {
    var collection = result[key] = result[key] || []
    addThreadBumps(collection, grouped.likes[key], compare)
  })

  return result
}

function addThreadBumps (result, msgs, compare) {
  msgs.forEach(msg => {
    SortedArray.add(result, msg, compare)
  })
}

function insertContacts (result, contacts, compare) {
  var areFriends = new Set()
  var follows = []
  var friendCount = {}
  var profileWasFollowedCount = {}
  var profileDidFollowCount = {}

  // count the different relationship types
  Object.keys(contacts).forEach(key => {
    var msg = contacts[key][0]
    if (!msg || msg.value.content.following !== true) return

    follows.push(msg)

    var profileId = msg.value.author
    var targetId = msg.value.content.contact
    var reverse = contacts[`${targetId}:${profileId}`]
    var followedBack = reverse && reverse[0] && reverse[0].value.content.following
    if (followedBack) {
      friendCount[profileId] = (friendCount[profileId] || 0) + 1
      friendCount[targetId] = (friendCount[targetId] || 0) + 1
      areFriends.add(friendshipKey(profileId, targetId))
    } else {
      profileDidFollowCount[profileId] = (profileDidFollowCount[profileId] || 0) + 1
      profileWasFollowedCount[targetId] = (profileWasFollowedCount[targetId] || 0) + 1
    }
  })

  var friends = {}
  var followTargets = {}
  var followSources = {}

  // sort into groups of follow types
  follows.forEach(msg => {
    var profileId = msg.value.author
    var targetId = msg.value.content.contact
    if (areFriends.has(friendshipKey(profileId, targetId))) {
      var id = friendCount[profileId] > friendCount[targetId] ? profileId : targetId
      ;(friends[id] = friends[id] || []).push(msg)
    } else if (profileDidFollowCount[profileId] > profileWasFollowedCount[targetId]) {
      ;(followSources[profileId] = followSources[profileId] || []).push(msg)
    } else {
      ;(followTargets[targetId] = followTargets[targetId] || []).push(msg)
    }
  })

  // add different types of follows to feed
  Object.keys(friends).forEach(id => {
    SortedArray.add(result, {
      type: 'friends',
      id,
      contacts: new Set(friends[id].map(msg => msg.value.author).filter(x => x !== id)),
      bumps: friends[id]
    }, compare)
  })

  Object.keys(followTargets).forEach(id => {
    SortedArray.add(result, {
      type: 'follow-target',
      id,
      contacts: new Set(followTargets[id].map(msg => msg.value.author)),
      bumps: followTargets[id]
    }, compare)
  })

  Object.keys(followSources).forEach(id => {
    SortedArray.add(result, {
      type: 'follow-source',
      id,
      contacts: new Set(followSources[id].map(msg => msg.value.content.contact)),
      bumps: followSources[id]
    }, compare)
  })
}

function length (array) {
  return array && array.length || 0
}

function friendsFromKey (key) {
  return key.split(':')
}

function friendshipKey (a, b) {
  return [a, b].sort().join(':')
}

function groupByType (messages) {
  return messages.reduce((result, msg) => {
    var c = msg.value.content
    if (ref.isMsg(c.root)) { // a reply
      var collection = result.replies[c.root] = result.replies[c.root] || []
      collection.push(msg)
    } else if (c.type === 'vote') { // a like
      if (c.vote && ref.isMsg(c.vote.link)) {
        var collection = result.likes[c.vote.link] = result.likes[c.vote.link] || []
        collection.push(msg)
      }
    } else if (c.type === 'post') { // root post
      result.roots[msg.key] = msg
    } else if (c.type === 'about' && ref.isFeed(c.about)) { // about profile
      result.roots[msg.key] = msg
    } else if (c.type === 'channel') {
      var channel = c.channel
      var subscriber = msg.value.author
      if (typeof channel === 'string' && channel.length && channel.length < 30) {
        var collection = result.channels[subscriber] = result.channels[subscriber] || []
        collection.push(msg)
      }
    } else if (c.type === 'contact') {
      var targetId = c.contact
      if (ref.isFeed(targetId)) {
        var key = `${msg.value.author}:${targetId}`
        var collection = result.contacts[key] = result.contacts[key] || []
        collection.push(msg)
      }
    }
    return result
  }, {
    roots: {},
    replies: {},
    likes: {},
    channels: {},
    contacts: {}
  })
}

function last (array) {
  if (Array.isArray(array)) {
    return array[array.length - 1]
  }
}
