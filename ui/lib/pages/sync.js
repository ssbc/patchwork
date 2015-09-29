'use strict'
var h = require('hyperscript')
var o = require('observable')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var com = require('../com')
var u = require('../util')
var social = require('../social-graph')

module.exports = function () {

  // markup

  var pubStatusEl = h('.pub-status')
  var peersEl = h('.peers',
    h('h3', 'Mesh Network', h('a.pull-right.btn.btn-3d.btn-sm', { onclick: addnode }, com.icon('plus'), ' Add Node...')), 
    o.transform(app.observ.peers, function (peers) {
      return h('div', peers.map(renderPeer))
    })
  )
  ui.setPage('sync', h('.layout-onecol',
    h('.layout-main', 
      o.transform(app.observ.peers, function () {
        var stats = u.getPubStats()
        var danger1 = (stats.membersof === 0) ? '.text-danger' : ''
        var danger2 = (stats.active === 0) ? '.text-danger' : ''

        var warning
        if (stats.membersof === 0)
          warning = h('p', com.icon('warning-sign'), ' You need to join a pub if you want to communicate across the Internet!')
        else if (stats.active === 0 && stats.untried === 0)
          warning = h('p', com.icon('warning-sign'), ' None of your pubs are responding! Are you connected to the Internet?')

        return h('.pub-status',
          h('h3'+danger1, 'You\'re followed by ', stats.membersof,' public node', (stats.membersof==1?'':'s'), ' ', h('small'+danger2, stats.active, ' connected')),
          warning,
          h('p', h('a.btn.btn-3d', { href: '#', onclick: modals.invite }, com.icon('cloud'), ' Join a Public Node'))
        )
      }),
      peersEl
    )
  ))


  function setprogress (el, p, label) {
    el.querySelector('.progress-bar').style.width = p + '%'
    el.querySelector('.progress-bar span').innerText = label
    if (label)
      el.querySelector('.progress-bar').style.minWidth = '12%'
    else
      el.querySelector('.progress-bar').style.minWidth = '2%'
  }

  function renderPeer (peer) {
    function onsync (e) {
      e.preventDefault()
      app.ssb.gossip.connect({ host: peer.host, port: peer.port, key: peer.key }, function (){})
    }

    var lastConnect
    if (peer.time) {
      if (peer.time.connect > peer.time.attempt)
        lastConnect = [h('span.text-success', com.icon('ok')), ' Synced '+(new Date(peer.time.connect).toLocaleString())]
      else if (peer.time.attempt) {
        lastConnect = [h('span.text-danger', com.icon('remove')), ' Attempted (but failed) to connect at '+(new Date(peer.time.attempt).toLocaleString())]
      }
    }

    var el = h('.peer' + ((peer.connected)?'.connected':''), { 'data-id': peer.key },
      com.userHexagon(peer.key, 80),
      h('.details',
        social.follows(peer.key, app.user.id) ? h('small.pull-right.label.label-success', 'Follows You') : '',
        h('h3',
            com.userName(peer.key),
            ' ',
            ((peer.connected) ?
              h('a.btn.btn-3d.btn-xs.disabled', 'Syncing') :
              h('a.btn.btn-3d.btn-xs', { href: '#', onclick: onsync }, 'Sync')),
            ' ',
            h('br'), h('small', peer.host+':'+peer.port+':'+peer.key)
          ),
        h('.progress', h('.progress-bar.progress-bar-striped.active', h('span'))),
        h('p.last-connect', lastConnect)
      )
    )

    if (peer.connected) {
      if (!peer.progress)
        setprogress(el, 0, ' Connecting... ')
      else if (peer.progress.sync)
        setprogress(el, 100, 'Live-streaming')
      else
        setprogress(el, Math.round(peer.progress.current / peer.progress.total * 100), 'Syncing...')
    }

    return el
  }

  // handlers

  function addnode () {
    modals.prompt('Nodes full address:', 'host:port@key', 'Connect', function (err, addr) {
      app.ssb.gossip.connect(addr, function (err) {
        if (err)
          modals.error('Failed to Connect', err, 'Error occurred while trying to manually add a node to the network mesh.')
      })
    })
  }
}
