'use strict'
var h = require('hyperscript')
var o = require('observable')
var pull = require('pull-stream')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var subwindows = require('../ui/subwindows')
var u = require('../util')
var social = require('../social-graph')
var suggestBox = require('suggest-box')
var ago = require('nicedate')

var a =
exports.a = function (href, text, opts) {
  opts = opts || {}
  opts.href = href
  return h('a', opts, text)
}

var icon =
exports.icon = function (i) {
  return h('span.glyphicon.glyphicon-'+i)
}

var userlink =
exports.userlink = function (id, text, opts) {
  opts = opts || {}
  opts.className = (opts.className || '') + ' user-link'
  text = text || userName(id) || u.shortString(id)
  return h('span.user-link-outer', a('#/profile/'+id, text, opts))
}

var user =
exports.user = function (id, opts) {
  var followIcon
  if (id != app.user.id && (!app.user.profile.assignedTo[id] || !app.user.profile.assignedTo[id].following)) {
    followIcon = [' ', h('a', 
      { title: 'This is not somebody you follow.', href: '#/profile/'+id },
      h('span.text-muted', icon('question-sign'))
    )]
  }

  var l = userlink
  if (opts && opts.thin)
    l = userlinkThin

  var name = userName(id)
  if (opts && opts.maxlength && name.length > opts.maxlength)
    name = name.slice(0, opts.maxlength-3) + '...'

  return [l(id, name), followIcon]
}

var userName =
exports.userName = function (id) {
  return app.users.names[id] || u.shortString(id)
}

var profilePicUrl =
exports.profilePicUrl = function (id) {
  var url = './img/default-prof-pic.png'
  var profile = app.users.profiles[id]
  if (profile) {
    var link

    // lookup the image link
    if (profile.assignedBy[app.user.id] && profile.assignedBy[app.user.id].image)
      link = profile.assignedBy[app.user.id].image
    else if (profile.self.image)
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

var userImg =
exports.userImg = function (id) {
  return h('a.user-img', { href: '#/profile/'+id },
    h('img', { src: profilePicUrl(id) })
  )
}

var userlinkThin =
exports.userlinkThin = function (id, text, opts) {
  opts = opts || {}
  opts.className = (opts.className || '') + 'thin'
  return userlink(id, text, opts)
}

var hexagon =
exports.hexagon = function (url, size) {
  var img = url ? 'url('+url+')' : 'none'
  size = size || 30
  return h('.hexagon-'+size, { 'data-bg': url, style: 'background-image: '+img },
    h('.hexTop'),
    h('.hexBottom'))
}

var userHexagon =
exports.userHexagon = function (id, size) {
  return h('a.user-hexagon', { href: '#/profile/'+id },
    hexagon(profilePicUrl(id), size)
  )
}

var userRelationship =
exports.userRelationship = function (id, nfollowers, nflaggers) {
  if (id == app.user.id)
    return 'This is you!'

  // gather followers that you follow
  if (typeof nfollowers == 'undefined')
    nfollowers = social.followedFollowers(app.user.id, id).length
  var summary
  if (social.follows(app.user.id, id)) {
    summary = 'Followed by you'
    if (nfollowers > 0)
      summary += ' and ' + nfollowers + ' user' + (nfollowers==1?'':'s') + ' you follow'
  } else {
    if (nfollowers === 0)
      summary = 'Not followed by you or anyone you follow'
    else
      summary = 'Followed by ' + nfollowers + ' user' + (nfollowers==1?'':'s') + ' you follow'
  }

  // gather flaggers that you follow (and self)
  if (typeof nflaggers == 'undefined')
    nflaggers = social.followedFlaggers(app.user.id, id, true).length
  if (nflaggers !== 0) {
    summary += '. Flagged by '+nflaggers+' user' + (nflaggers==1?'':'s')
  }

  return summary
}

var hovercard =
exports.hovercard = function (id) {
  var name = userName(id)
  var following = social.follows(app.user.id, id)
  return h('.hovercard', { style: 'background-image: url('+profilePicUrl(id)+')' },
    h('h3', userName(id)),
    userRelationship(id),
    (id != app.user.id) ? h('p', following ? 'You follow ' : 'You do not follow ', name) : ''
  )
}

var userHexagrid =
exports.userHexagrid = function (uids, opts) {
  var nrow = (opts && opts.nrow) ? opts.nrow : 3
  var size = (opts && opts.size) ? opts.size : 60

  var els = [], row = []
  uids.forEach(function (uid) {
    row.push(userHexagon(uid, size))
    var n = (opts && opts.uneven && els.length % 2 == 1) ? nrow-1 : nrow
    if (row.length >= n) {
      els.push(h('div', row))
      row = []
    }
  })
  if (row.length)
    els.push(h('div', row))
  return h('.user-hexagrid-'+size, els)
}

var friendsHexagrid =
exports.friendsHexagrid = function (opts) {
  var friends = []
  friends.push(app.user.id)
  for (var k in app.users.profiles) {
    var p = app.users.profiles[k]
    if (opts && opts.reverse) {
      if (p.assignedTo[app.user.id] && p.assignedTo[app.user.id].following)
        friends.push(p.id)
    } else {
      if (p.assignedBy[app.user.id] && p.assignedBy[app.user.id].following)
        friends.push(p.id)
    }
  }
  if (friends.length)
    return userHexagrid(friends, opts)
}

exports.filterClasses = function () {
  var cls = ''
  if (!app.filters.nsfw)
    cls += '.show-nsfw'
  if (!app.filters.spam)
    cls += '.show-spam'
  if (!app.filters.abuse)
    cls += '.show-abuse'
  return cls
}

var nav =
exports.nav = function (opts) {
  var items = opts.items.map(function (item) {
    var cls = '.navlink-'+item[0]
    if (item[0] == opts.current)
      cls += '.selected'
    if (item[3])
      cls += item[3]
    if (typeof item[1] == 'function')
      return h('a'+cls, { href: '#', 'data-item': item[0], onclick: item[1] }, item[2])
    return h('a'+cls, { href: item[1] }, item[2])
  })
  return h('.navlinks', items)
}

var search =
exports.search = function (opts) {
  var searchInput = h('input.search', { type: 'text', name: 'search', placeholder: 'Search', value: opts.value })
  return h('form', { onsubmit: opts.onsearch }, searchInput)
}

exports.paginator = function (base, start, count) {
  var prevBtn = h('a.btn.btn-primary', { href: base+((start - 30 > 0) ? start - 30 : 0) }, icon('chevron-left'))
  var nextBtn = h('a.btn.btn-primary', { href: base+(start+30) }, icon('chevron-right'))
  if (start <= 0) prevBtn.setAttribute('disabled', true)    
  if (start+30 > count) nextBtn.setAttribute('disabled', true)
  return h('p', prevBtn, (start + 1), ' - ', Math.min(count, (start + 30)), ' ('+count+')', nextBtn)
}

var panel =
exports.panel = function (title, content) {
  return h('.panel.panel-default', [
    (title) ? h('.panel-heading', h('h3.panel-title', title)) : '',
    h('.panel-body', content)
  ])
}

var page =
exports.page = function (id, content) {
  return h('#page.container-fluid.'+id+'-page', content)
}

exports.prettyRaw = require('./pretty-raw')
exports.messageFeed = require('./message-feed')
exports.message = require('./message')
exports.messageContent = require('./message-content')
exports.messageSummary = require('./message-summary')
exports.messageOneline = require('./message-oneline')
exports.messageAttachments = require('./message-attachments')
exports.messageStats = require('./message-stats')
exports.contactFeed = require('./contact-feed')
exports.contactPlaque = require('./contact-plaque')
exports.contactListing = require('./contact-listing')
exports.files = require('./files')
exports.notifications = require('./notifications')
exports.peers = require('./peers')
exports.postForm = require('./post-form')
exports.pmForm = require('./pm-form')
exports.webcamGifferForm = require('./webcam-giffer-form')
exports.imagesForm = require('./images-form')
exports.composer = require('./composer')
exports.imageUploader = require('./image-uploader')
exports.inviteForm = require('./invite-form')
exports.lookupForm = require('./lookup-form')
exports.renameForm = require('./rename-form')
exports.flagForm = require('./flag-form')
exports.networkGraph = require('./network-graph')
exports.connectionGraph = require('./connection-graph')
exports.userDownloader = require('./user-downloader')
exports.help = require('./help')
exports.pagenav = require('./nav').pagenav
exports.sidenav = require('./nav').sidenav
exports.webview = require('./webview')
exports.finder = require('./finder')