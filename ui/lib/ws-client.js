var muxrpc     = require('muxrpc')
var pull       = require('pull-stream')
var ws         = require('pull-ws-server')
var Serializer = require('pull-serializer')

module.exports = function () {
  // create rpc object
  var ssb = muxrpc(manifest, false, serialize)()

  // setup rpc stream over websockets
  var protocol = (window.location.protocol == 'https:') ? 'wss:' : 'ws:'
  var stream = ws.connect(protocol+'//localhost:7778')
  pull(stream, ssb.createStream(), stream)
  return ssb
}

function serialize (stream) {
  return Serializer(stream, JSON, {split: '\n\n'})
}

// manifest TEMPORARY
var manifest = {
  "auth": "async",
  "address": "sync",
  "manifest": "sync",
  "get": "async",
  "createFeedStream": "source",
  "createLogStream": "source",
  "messagesByType": "source",
  "createHistoryStream": "source",
  "createUserStream": "source",
  "links": "source",
  "relatedMessages": "async",
  "add": "async",
  "publish": "async",
  "getAddress": "sync",
  "getLatest": "async",
  "latest": "source",
  "latestSequence": "async",
  "whoami": "sync",
  "usage": "sync",
  "gossip": {
    "peers": "sync",
    "add": "sync",
    "connect": "async",
    "changes": "source"
  },
  "friends": {
    "all": "async",
    "hops": "async",
    "createFriendStream": "source",
    "get": "sync"
  },
  "replicate": {
    "changes": "source"
  },
  "blobs": {
    "get": "source",
    "has": "async",
    "add": "sink",
    "rm": "async",
    "ls": "source",
    "want": "async",
    "wants": "sync",
    "changes": "source"
  },
  "invite": {
    "create": "async",
    "accept": "async",
    "addMe": "async",
    "use": "async"
  },
  "block": {
    "isBlocked": "sync"
  },
  "private": {
    "publish": "async",
    "unbox": "sync"
  },
  "patchwork": {
    "createEventStream": "source",
    "getIndexCounts": "async",
    "createNewsfeedStream": "source",
    "createInboxStream": "source",
    "createBookmarkStream": "source",
    "createNotificationsStream": "source",
    "createChannelStream": "source",
    "markRead": "async",
    "markUnread": "async",
    "toggleRead": "async",
    "isRead": "async",
    "bookmark": "async",
    "unbookmark": "async",
    "toggleBookmark": "async",
    "isBookmarked": "async",
    "getChannels": "async",
    "pinChannel": "async",
    "unpinChannel": "async",
    "toggleChannelPinned": "async",
    "addFileToBlobs": "async",
    "saveBlobToFile": "async",
    "useLookupCode": "source",
    "getMyProfile": "async",
    "getProfile": "async",
    "getAllProfiles": "async",
    "getNamesById": "async",
    "getName": "async",
    "getIdsByName": "async",
    "getActionItems": "async"
  }
}