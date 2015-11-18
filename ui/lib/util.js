var pull = require('pull-stream')
var ip = require('ip')
var mlib = require('ssb-msgs')
var mime = require('mime-types')
var multicb = require('multicb')
var app = require('./app')
var social = require('./social-graph')

exports.debounce = function (fn, wait) {
  var timeout
  return function() {
    clearTimeout(timeout)
    timeout = setTimeout(fn, wait)
  }
}

exports.shortString = function(str, len) {
  len = len || 6
  if (str.length - 3 > len)
    return str.slice(0, len) + '...'
  return str
}

var dataSizes = ['kb', 'mb', 'gb', 'tb', 'pb', 'eb', 'zb', 'yb']
exports.bytesHuman = function (nBytes) {
  var str = nBytes + 'b'
  for (var i = 0, nApprox = nBytes / 1024; nApprox > 1; nApprox /= 1024, i++) {
    str = nApprox.toFixed(2) + dataSizes[i]
  }
  return str
}

exports.getName = function (id) {
  return app.users.names[id] || exports.shortString(id, 6)
}

exports.profilePicUrl = function (id) {
  var url = './img/default-prof-pic.png'
  var profile = app.users.profiles[id]
  if (profile) {
    var link

    // lookup the image link
    if (profile.self.image)
      link = profile.self.image

    if (link) {
      url = 'http://localhost:7777/'+link.link

      // append the 'backup img' flag, so we always have an image
      url += '?fallback=img'

      // if we know the filetype, try to construct a good filename
      if (link.type) {
        var ext = link.type.split('/')[1]
        if (ext) {
          var name = app.users.names[id] || 'profile'
          url += '&name='+encodeURIComponent(name+'.'+ext)
        }
      }
    }
  }
  return url
}

exports.getPubStats = function (peers) {
  var membersof=0, membersofActive=0, membersofUntried=0, connected=0
  ;(peers||app.peers).forEach(function (peer) {
    // filter out LAN peers
    if (peer.host == 'localhost' || ip.isPrivate(peer.host))
      return
    var connectSuccess = (peer.time && peer.time.connect && (peer.time.connect > peer.time.attempt) || peer.connected)
    if (connectSuccess)
      connected++
    if (social.follows(peer.key, app.user.id)) {
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