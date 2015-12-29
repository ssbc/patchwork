var app = require('./app')

var follows =
exports.follows = function (a, b) {
  var ap = app.users.profiles[a]
  if (!ap) return false
  return ap.assignedTo[b] && ap.assignedTo[b].following
}

var flags =
exports.flags = function (a, b) {
  var ap = app.users.profiles[a]
  if (!ap) return false
  return ap.assignedTo[b] && ap.assignedTo[b].flagged
}

var blocks =
exports.blocks = function (a, b) {
  var ap = app.users.profiles[a]
  if (!ap) return false
  return ap.assignedTo[b] && ap.assignedTo[b].blocking
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
  var ids = []
  for (var a in app.users.profiles) {
    if (follows(a, b))
      ids.push(a)
  }
  return ids
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
