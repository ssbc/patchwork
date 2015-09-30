'use strict'
var pull   = require('pull-stream')
var ui     = require('./lib/ui')
var modals = require('./lib/ui/modals')

// Init
// ====

// master state object
window.app = require('./lib/app')

// toplevel events
window.addEventListener('hashchange', ui.refreshPage)
window.addEventListener('contextmenu', ui.contextMenu)
window.addEventListener('error', onError)
document.body.addEventListener('click', onClick)
document.body.addEventListener('mouseover', onHover)
pull(app.ssb.patchwork.createEventStream(), pull.drain(onIndexEvent))
pull(app.ssb.blobs.changes(), pull.drain(onBlobDownloaded))
pull(app.ssb.gossip.changes(), pull.drain(onGossipEvent))
pull(app.ssb.replicate.changes(), pull.drain(onReplicationEvent))
app.observ.newPosts(onNewPost)

// render
ui.refreshPage(null, ui.pleaseWait.bind(ui, false))

// Handlers
// ========

function onError (e) {
  e.preventDefault()
  console.error(e.error)
  modals.error('Unexpected Error', e.error, 'This was an unhandled exception.')
}

// look for link clicks which should trigger same-page refreshes
function onClick (e) {
  var el = e.target
  while (el) {
    if (el.tagName == 'A' && el.origin == window.location.origin && el.hash && el.hash == window.location.hash) {
      e.preventDefault()
      e.stopPropagation()
      ui.refreshPage()
      return
    }
    el = el.parentNode
  }
}
function onHover (e) {
  var el = e.target
  while (el) {
    if (el.tagName == 'A') {
      if (el.getAttribute('title')) {
        ui.setStatus(el.getAttribute('title'))
      } else if (el.href) {
        var i = el.href.indexOf('#')
        if (i > 0)
          ui.setStatus(el.href.slice(i+1))
        else
          ui.setStatus(el.href)
      }
      return 
    }
    el = el.parentNode
  }
  ui.setStatus(false)
}

// update UI to reflect index changes
function onIndexEvent (event) {
  if (event.type == 'home-add')
    app.observ.newPosts(1 + app.observ.newPosts())
  if (event.type == 'index-change') {
    app.indexCounts[event.index] = event.total
    app.indexCounts[event.index+'Unread'] = event.unread
    app.observ.indexCounts[event.index](event.total)
    app.observ.indexCounts[event.index+'Unread'](event.unread)
  }
}

// render blobs as they come in
function onBlobDownloaded (hash) {
  // hash downloaded, update any images
  var els = document.querySelectorAll('img[src^="http://localhost:7777/'+hash+'"]')
  for (var i=0; i < els.length; i++)
    els[i].src = 'http://localhost:7777/'+hash
  var els = document.querySelectorAll('video[src^="http://localhost:7777/'+hash+'"]')
  for (var i=0; i < els.length; i++)
    els[i].src = 'http://localhost:7777/'+hash
  var els = document.querySelectorAll('[data-bg^="http://localhost:7777/'+hash+'"]')
  for (var i=0; i < els.length; i++)
    els[i].style.backgroundImage = 'url(http://localhost:7777/'+hash+')'
}

function onGossipEvent (e) {
  // update the peers
  var i
  for (i=0; i < app.peers.length; i++) {
    if (app.peers[i].key == e.peer.key && app.peers[i].host == e.peer.host && app.peers[i].port == e.peer.port) {
      app.peers[i] = e.peer
      break
    }
  }
  if (i == app.peers.length)
    app.peers.push(e.peer)
  var stats = require('./lib/util').getPubStats()

  // update observables
  app.observ.peers(app.peers)
  app.observ.hasSyncIssue(stats.hasSyncIssue)
}

function onReplicationEvent (e) {
  // update the peers
  var progress = { feeds: e.feeds, sync: e.sync, current: e.progress, total: e.total }
  var i
  for (i=0; i < app.peers.length; i++) {
    if (app.peers[i].key == e.peerid) {
      app.peers[i].progress = progress
      break
    }
  }

  // update observables
  if (i !== app.peers.length)
    app.observ.peers(app.peers)
}

// update title to show when new messages are available
function onNewPost (n) {
  n = (n<0)?0:n
  var name = app.users.names[app.user.id] || 'New Account'
  if (n) {
    document.title = '-=[ ('+n+') Patchwork : '+name+' ]=-'
  } else {
    document.title = '-=[ Patchwork : '+name+' ]=-'
  }
}