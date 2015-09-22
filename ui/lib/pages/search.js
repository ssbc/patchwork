'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')
var social = require('../social-graph')

module.exports = function () {

  // filters

  if (!app.page.param) {
    window.location.hash = '#/'
    return 
  }
  var regex = new RegExp(app.page.param.split(' ').join('|'), 'i')

  function postFeed (opts) {
    opts = opts || {}
    opts.type = 'post'
    return app.ssb.messagesByType(opts)
  }

  function postFilter (m) {
    var a = m.value.author, c = m.value.content
    if (app.users.profiles[a] && app.users.profiles[a].flagged) // flagged by user
      return false
    if (c.text && regex.test(c.text))
      return true
    // if (app.homeMode.view == 'all')
    //   return true
    // if (app.homeMode.view == 'friends')
    //   return a == app.user.id || social.follows(app.user.id, a)
    // return social.follows(app.homeMode.view, a) // `view` is the id of a pub
  }

  function contactFilter (p) {
    if (p.self.name && regex.test(p.self.name))
      return true
  }

  function cursor (msg) {
    if (msg)
      return msg.ts
  }

   // markup

  ui.setPage('home', h('.layout-twocol',
    h('.layout-main', 
      h('h3', 'Search, "', app.page.param, '"'),
      com.messageFeed({ feed: postFeed, cursor: cursor, filter: postFilter, onempty: onempty, infinite: true })
    ),
    h('.layout-rightnav',
      h('h3', 'People'),
      com.contactFeed({ filter: contactFilter, compact: true, onempty: onempty })
    )
  ))

  function onempty (el) {
    el.appendChild(h('p', 'No results found'))
  }

}
