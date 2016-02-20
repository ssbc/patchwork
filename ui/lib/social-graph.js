var ip = require('ip')
var app = require('./app')

var follows =
exports.follows = function (a, b) {
  var bp = app.users.profiles[b]
  if (!bp) return false
  return bp.followers[a]
}

var flags =
exports.flags = function (a, b) {
  var bp = app.users.profiles[b]
  if (!bp) return false
  return bp.flaggers[a]
}

var followeds =
exports.followeds = function (a) {
  var ids = []
  for (var b in app.users.profiles) {
    if (follows(a, b))
      ids.push(b)
  }
  return ids
}

var followers =
exports.followers = function (b) {
  var bp = app.users.profiles[b]
  if (!bp) return []
  return Object.keys(bp.followers)
}

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

var unfollowedFollowers =
exports.unfollowedFollowers = function (a, c) {
  var ids = []
  for (var b in app.users.profiles) {
    if (a != b && !follows(a, b) && follows(b, c))
      ids.push(b)
  }
  return ids
}

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

var contacts =
exports.contacts = function (a) {
  // all two-way follows
  return followers(a).filter(function (b) {
    return follows(b, a)
  })
}

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