'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')

module.exports = function (pid) {

  // markup

  var feed = app.ssb.createFeedStream
  if (pid) {
    feed = function (opts) {
      opts = opts || {}
      opts.id = pid
      return app.ssb.createUserStream(opts)
    }
  }

  ui.setPage('feed', h('.layout-onecol',
    h('.layout-main',
      h('h3.text-center', 'Behind the Scenes ', h('small', 'Raw Data Feed')),
      com.messageFeed({ feed: feed, render: com.messageSummary.raw, infinite: true })
    )
  ))
}
