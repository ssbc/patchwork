var pull = require('pull-stream')
var ip = require('ip')
var mlib = require('ssb-msgs')
var mime = require('mime-types')
var multicb = require('multicb')
var moment = require('moment')
var app = require('./app')
var social = require('./social-graph')

exports.debounce = function (fn, wait) {
  var timeout
  return function() {
    clearTimeout(timeout)
    timeout = setTimeout(fn, wait)
  }
}

// helper to put an s at the end of words if they're plural only
exports.plural = function (n) {
  return n === 1 ? '' : 's'
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

// break an array into arrays of fixed length
exports.chunk = function (arr, size) {
  var arrs = [], i=0, s=0
  while (i < arr.length) {
    arrs.push(arr.slice(i, i+size))
    i += size
  }
  return arrs
}

module.exports.isImageFilename = function (name) {
  if (typeof name !== 'string')
    return false
  return isImageContentType(mime.contentType(name))
}

var isImageContentType =
module.exports.isImageContentType = function (ct) {
  return (typeof ct == 'string' && ct.indexOf('image/') === 0)
}

const startOfDay = moment().startOf('day')
const lastWeek = moment().subtract(1, 'weeks')
const lastYear = moment().subtract(1, 'years')
exports.niceDate = function (ts, ago) {
  var d = moment(ts)
  if (ago)
    return d.fromNow()
  if (d.isBefore(lastYear))
    d = d.format('')
  else if (d.isBefore(lastWeek))
    d = d.format('MMM D')
  else if (d.isBefore(startOfDay))
    d = d.format('ddd h:mma')
  else
    d = d.format('h:mma')
  return d
}

exports.getName = function (id) {
  return app.users.names[id] || exports.shortString(id, 6)
}

exports.profilePic = function (id) {
  var profile = app.users.profiles[id]
  if (profile) {
    var link

    // lookup the image link
    if (profile.byMe.image)
      return profile.byMe.image // use local user's choice...
    else if (profile.self.image)
      return profile.self.image // ...fallback to their choice
  }
  return false
}

exports.profilePicRef = function (id) {
  var link = exports.profilePic(id)
  return link ? link.link : false
}

exports.profilePicUrl = function (id) {
  var url = './img/default-prof-pic.png'
  var link = exports.profilePic(id)
  if (link) {
    url = '/'+link.link

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
  return url
}

exports.getPubStats = function (peers) {
  var membersof=0, membersofActive=0, membersofUntried=0, connected=0
  ;(peers||app.peers||[]).forEach(function (peer) {
    // filter out LAN peers
    if (ip.isLoopback(peer.host) || ip.isPrivate(peer.host))
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

