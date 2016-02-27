var ip = require('ip')
var app = require('./app')

// does `a` follow `b`?
var follows =
exports.follows = function (a, b) {
  var bp = app.users.profiles[b]
  if (!bp) return false
  return bp.followers[a]
}

// did `a` flag `b`?
var flags =
exports.flags = function (a, b) {
  var bp = app.users.profiles[b]
  if (!bp) return false
  return bp.flaggers[a]
}

// get all who `a` follows
var followeds =
exports.followeds = function (a) {
  var ids = []
  for (var b in app.users.profiles) {
    if (follows(a, b))
      ids.push(b)
  }
  return ids
}

// get all who `a` follows, but who doesnt follow `a` back
var followedNonfriends =
exports.followedNonfriends = function (a) {
  var ids = []
  for (var b in app.users.profiles) {
    if (follows(a, b) && !follows(b, a))
      ids.push(b)
  }
  return ids
}

// get all who follow `a`
var followers =
exports.followers = function (b) {
  var bp = app.users.profiles[b]
  if (!bp) return []
  return Object.keys(bp.followers)
}

// get all who follow `a`, but who `a` doesnt follow back
var followerNonfriends =
exports.followerNonfriends = function (a) {
  var ids = []
  for (var b in app.users.profiles) {
    if (follows(b, a) && !follows(a, b))
      ids.push(b)
  }
  return ids
}

// get all who follow `c`, who are followed by `a`
var followedFollowers =
exports.followedFollowers = function (a, c, includeA) {
  var ids = []
  for (var b in app.users.profiles) {
    if (follows(a, b) && follows(b, c))
      ids.push(b)
  }
  if (includeA && follows(a, c))
    ids.push(a)
  return ids
}

// get all who follow `c`, who are not followed by `a`
var unfollowedFollowers =
exports.unfollowedFollowers = function (a, c) {
  var ids = []
  for (var b in app.users.profiles) {
    if (a != b && !follows(a, b) && follows(b, c))
      ids.push(b)
  }
  return ids
}

// get all who flag `c`, who are followed by `a`
var followedFlaggers =
exports.followedFlaggers = function (a, c, includeA) {
  var ids = []
  for (var b in app.users.profiles) {
    if (follows(a, b) && flags(b, c))
      ids.push(b)
  }
  if (includeA && flags(a, c))
    ids.push(a)
  return ids
}

// get all who follow `a`, and who `a` follows back
var friends =
exports.friends = function (a) {
  // all two-way follows
  return followers(a).filter(function (b) {
    return follows(a, b)
  })
}

// is `id` a pub?
var isPub =
exports.isPub = function (id) {
  // try to find the ID in the peerlist, and see if it's a public peer if so
  for (var i=0; i < app.peers.length; i++) {
    var peer = app.peers[i]
    if (peer.key === id && !ip.isPrivate(peer.host))
      return true
  }
  return false
}