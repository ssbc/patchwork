'use strict'

/*
Application Master State
========================
Common state which either exists as part of the session,
or which has  been  loaded  from  scuttlebot during page
refresh because  its  commonly  needed during rendering.
*/


var multicb   = require('multicb')
var SSBClient = require('./muxrpc-ipc')
var emojis    = require('emoji-named-characters')
var Emitter   = require('events')
var extend    = require('xtend/mutable')

// master state object
var app =
module.exports = extend(new Emitter(), {
  // sbot rpc connection
  ssb: SSBClient(),

  // pull state from sbot, called on every view change
  fetchLatestState: fetchLatestState,

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

  // application state, fetched every refresh
  actionItems: {},
  indexCounts: {},
  user: {
    id: null,
    profile: {},
    followeds: [], // people the user follows
    friends: [], // people the user follows, who follow the user back
    nonfriendFolloweds: [], // people the user follows, who dont follow the user back
    nonfriendFollowers: [] // people the user doesnt follow, who follows the user
  },
  users: {
    names: {},
    profiles: {}
  },
  peers: [],
})

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

    // get friend list
    var social = require('./social-graph')
    app.user.followeds = social.followeds(app.user.id)
    app.user.friends = app.user.followeds.filter(function (other) { return other !== app.user.id && social.follows(other, app.user.id) })
    app.user.nonfriendFolloweds = app.user.followeds.filter(function (other) { return other !== app.user.id && !social.follows(other, app.user.id) })
    app.user.nonfriendFollowers = social.unfollowedFollowers(app.user.id, app.user.id)

    // refresh suggest options for usernames
    app.suggestOptions['@'] = []
    for (var id in app.users.profiles) {
      if (id == app.user.profile.id || (app.user.profile.assignedTo[id] && app.user.profile.assignedTo[id].following)) {
        var name = app.users.names[id]
        app.suggestOptions['@'].push({
          id: id,
          cls: 'user',        
          title: name || id,
          image: require('./util').profilePicUrl(id),
          subtitle: name || id,
          value: name || id.slice(1) // if using id, dont include the @ sigil
        })
      }
    }

    app.emit('update:all')
    cb && cb()
  })
}