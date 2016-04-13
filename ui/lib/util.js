var ip = require('ip')
var social = require('patchkit-util/social')
var app = require('./app')

exports.getPubStats = function (peers) {
  var membersof=0, membersofActive=0, membersofUntried=0, connected=0
  ;(peers||app.peers||[]).forEach(function (peer) {
    // filter out LAN peers
    if (ip.isLoopback(peer.host) || ip.isPrivate(peer.host))
      return
    var connectSuccess = (peer.time && peer.time.connect && (peer.time.connect > peer.time.attempt) || peer.connected)
    if (connectSuccess)
      connected++
    if (social.follows(app.users, peer.key, app.user.id)) {
      membersof++
      if (connectSuccess)
        membersofActive++
      if (!peer.time || !peer.time.attempt)
        membersofUntried++
    }
  })

  return {
    membersof: membersof,
    membersofActive: membersofActive,
    membersofUntried: membersofUntried,
    connected: connected,
    hasSyncIssue: (!membersof || (!membersofUntried && !membersofActive))
  }
}

exports.getContactedPeerIds = function (peers) {
  let local = new Array()
  let remote = new Array()
  let connected = new Array()

  ;(peers||app.peers||[]).forEach(function (peer) {
    if (ip.isLoopback(peer.host)) return

    if (peer.connected) {
      connected.push(peer.id)
    }

    if (peer.connected || (peer.time && peer.time.connect)) {
      //TODO not sure about this
      if (ip.isPrivate(peer.host) || ip.isLoopback(peer.host)) { 
      //if (ip.isPrivate(peer.host)) { 
        local.push(peer.id)
      } else {
        remote.push(peer.id)
      }
    }
  })

  return {
    local: local,
    remote: remote,
    connected: connected
  }
}