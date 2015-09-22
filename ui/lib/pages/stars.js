'use strict'
var h = require('hyperscript')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')

module.exports = function () {
  var p = app.page.param || 'onyours'
  var render = (p == 'onyours') ? com.messageSummary                 : com.message
  var feed   = (p == 'onyours') ? app.ssb.patchwork.createVoteStream : app.ssb.patchwork.createMyvoteStream

  // markup

  ui.setPage('stars', h('.layout-onecol',
    h('.layout-main', 
      h('h3.text-center', 
        h((p == 'onyours' ? 'strong' : 'a'), { href: '#/stars/onyours'}, 'Stars on Your Posts'),
        ' / ',
        h((p == 'byyou' ? 'strong' : 'a'), { href: '#/stars/byyou'}, 'Starred by You')
      ),
      com.messageFeed({ render: render, feed: feed, markread: true, onempty: onempty, infinite: true }))
  ))

  function onempty (feedEl) {
    feedEl.appendChild(h('p.text-center', { style: 'margin: 25px 0; padding: 10px; color: gray' }, 'No stars... yet!'))
  }
}
