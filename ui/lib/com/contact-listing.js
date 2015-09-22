var h = require('hyperscript')
var schemas = require('ssb-msg-schemas')
var app = require('../app')
var ui = require('../ui')
var modals = require('../ui/modals')
var com = require('./index')
var u = require('../util')
var social = require('../social-graph')

module.exports = function (profile, opts) {

  // markup 

  var id = profile.id
  var isfollowed = social.follows(app.user.id, profile.id)
  var nfollowers = social.followedFollowers(app.user.id, id).length

  var followbtn
  renderFollow()
  function renderFollow () {
    if (id != app.user.id) {
      var newbtn
      if (!isfollowed)
        newbtn = h('button.btn.btn-3d', { title: 'Follow', onclick: toggleFollow }, com.icon('plus'), ' Follow')
      else
        newbtn = h('button.btn.btn-3d', { title: 'Unfollow', onclick: toggleFollow }, com.icon('minus'), ' Unfollow')
      if (followbtn)
        followbtn.parentNode.replaceChild(newbtn, followbtn)
      followbtn = newbtn
    }
  }

  // render
  var listing = h('.contact-listing' + ((opts && opts.compact) ? '.compact' : ''),
    h('.profpic', com.userHexagon(id, (opts && opts.compact) ? 45 : 80)),
    h('.details',
      h('p.name', com.a('#/profile/'+id, app.users.names[id] || id)),
      h('p', com.userRelationship(id, nfollowers))
    ),
    (!opts || !opts.compact) ? h('.actions', followbtn) : ''
  )
  listing.dataset.followers = nfollowers
  return listing

  // handlers

  function toggleFollow (e) {
    e.preventDefault()

    // optimistically render
    isfollowed = !isfollowed
    renderFollow()

    // update
    ui.pleaseWait(true, 1000)
    app.ssb.publish((isfollowed) ? schemas.follow(profile.id) : schemas.unfollow(profile.id), function (err) {
      ui.pleaseWait(false)
      if (err) {
        isfollowed = !isfollowed
        renderFollow() 
        modals.error('Error While Publishing', err, 'This error occurred while trying to toggle follow on another user.')
      }
    })
  }
}