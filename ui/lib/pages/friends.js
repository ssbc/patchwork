'use strict'
var h = require('hyperscript')
var ref = require('ssb-ref')
var app = require('../app')
var ui = require('../ui')
var com = require('../com')
var social = require('../social-graph')

module.exports = function () {
  var queryStr = app.page.qs.q || ''
  var queryRegex
  
  // filters

  function stdfilter (prof) {
    if (prof.id == app.user.id) // is self
      return true
    if (app.users.names[prof.id] || social.follows(app.user.id, prof.id)) // has a name, or is a friend
      return true
  }

  function isRecommended (prof) {
    var nfollowers = social.followedFollowers(app.user.id, prof.id).length
    var nflaggers  = social.followedFlaggers(app.user.id, prof.id, true).length
    if (prof.id != app.user.id && !social.follows(app.user.id, prof.id) && nfollowers && !nflaggers)
      return true
  }

  function recommendFilterFn (prof) {
    if (!stdfilter(prof))
      return false
    return isRecommended(prof)
  }

  function othersFilterFn (prof) {
    if (!stdfilter(prof))
      return false
    return (prof.id != app.user.id && !social.follows(app.user.id, prof.id) && !isRecommended(prof))
  }

  // markup

  var newFollowersToShow = Math.max(app.indexCounts.followsUnread, 30)
  ui.setPage('followers', h('.layout-onecol',
    h('.layout-main',
      h('h3', 'Following'),
      h('div', { style: 'width: 850px; margin: 0 auto' }, com.friendsHexagrid({ size: 80, nrow: 10, uneven: true })),
      h('h3', 'Activity'),
      com.messageFeed({ render: com.messageSummary, feed: app.ssb.patchwork.createFollowStream, markread: true, limit: newFollowersToShow }),
      h('h3', { style: 'margin-top: 40px' }, 'Recommendations'),
      com.contactFeed({ filter: recommendFilterFn }),
      h('h3', { style: 'margin-top: 40px' }, 'Others'),
      com.contactFeed({ filter: othersFilterFn })
    )
  ))
}
