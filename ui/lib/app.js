'use strict'

/*
Application Master State
========================
Common state which either exists as part of the session,
or which has  been  loaded  from  scuttlebot during page
refresh because  its  commonly  needed during rendering.
*/

var o         = require('observable')
var multicb   = require('multicb')
var SSBClient = require('./muxrpc-ipc')
var emojis    = require('emoji-named-characters')

// master state object
var app =
module.exports = {
  // sbot rpc connection
  ssb: SSBClient(),

  // pull state from sbot, called on every view change
  fetchLatestState: fetchLatestState,

  // current view
  view: {
    id: 'inbox'
  },

  // ui data
  suggestOptions: { 
    ':': Object.keys(emojis).map(function (emoji) {
      return {
        image: './img/emoji/' + emoji + '.png',
        title: emoji,
        subtitle: emoji,
        value: emoji + ':'
      }
    }),
    '@': []
  },
  filters: {
    nsfw: true,
    spam: true,
    abuse: true
  },

  // application state, fetched every refresh
  actionItems: {},
  indexCounts: {},
  user: {
    id: null,
    profile: {}
  },
  users: {
    names: {},
    profiles: {}
  },
  peers: [],

  // global observables, updated by persistent events
  observ: {
    sideview: o(true),
    peers: o([]),
    hasSyncIssue: o(false),
    newPosts: o(0),
    indexCounts: {
      inbox: o(0),
      votes: o(0),
      follows: o(0),
      inboxUnread: o(0),
      votesUnread: o(0),
      followsUnread: o(0)
    }
  }
}

var firstFetch = true
function fetchLatestState (cb) {
  var done = multicb({ pluck: 1 })
  app.ssb.whoami(done())
  app.ssb.patchwork.getNamesById(done())
  app.ssb.patchwork.getAllProfiles(done())
  app.ssb.patchwork.getActionItems(done())
  app.ssb.patchwork.getIndexCounts(done())
  app.ssb.gossip.peers(done())
  done(function (err, data) {
    if (err) throw err.message
    app.user.id        = data[0].id
    app.users.names    = data[1]
    app.users.profiles = data[2]
    app.actionItems    = data[3]
    app.indexCounts    = data[4]
    app.peers          = data[5]
    app.user.profile   = app.users.profiles[app.user.id]

    // update observables
    app.observ.peers(app.peers)
    var stats = require('./util').getPubStats()
    app.observ.hasSyncIssue(stats.hasSyncIssue)
    for (var k in app.indexCounts)
      if (app.observ.indexCounts[k])
        app.observ.indexCounts[k](app.indexCounts[k])

    // refresh suggest options for usernames
    app.suggestOptions['@'] = []
    for (var id in app.users.profiles) {
      if (id == app.user.profile.id || (app.user.profile.assignedTo[id] && app.user.profile.assignedTo[id].following)) {
        var name = app.users.names[id]
        app.suggestOptions['@'].push({
          id: id,
          cls: 'user',        
          title: name || id,
          image: null,// require('./com').profilePicUrl(id), :TODO:
          subtitle: name || id,
          value: name || id.slice(1) // if using id, dont include the @ sigil
        })
      }
    }

    // do some first-load things
    if (firstFetch) {
      app.observ.newPosts(0) // trigger title render, so we get the correct name
      firstFetch = false
    }

    cb()
  })
}