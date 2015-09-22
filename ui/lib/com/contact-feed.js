'use strict'
var h = require('hyperscript')
var mlib = require('ssb-msgs')
var pull = require('pull-stream')
var multicb = require('multicb')
var app = require('../app')
var com = require('../com')

var mustRenderOpts = { mustRender: true }
module.exports = function (opts) {
  opts = opts || {}

  // markup
 
  var items = []
  for (var uid in app.users.profiles) {
    if (!opts.filter || opts.filter(app.users.profiles[uid]))
      items.push(com.contactListing(app.users.profiles[uid], opts))
  }

  items.sort(function (a, b) {
    return b.dataset.followers - a.dataset.followers
  })

  var feedel = h('.contact-feed', items.slice(0, opts.limit || 30))
  if (items.length === 0 && opts.onempty)
    opts.onempty(feedel)
  return h('.contact-feed-container', feedel)
}