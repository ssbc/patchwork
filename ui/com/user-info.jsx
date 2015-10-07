'use babel'
import React from 'react'
import { Link } from 'react-router'
import app from '../lib/app'
import u from '../lib/util'
import social from '../lib/social-graph'

export default class UserInfo extends React.Component {
  render() {
    var pid         = this.props.id
    var profile     = app.users.profiles[pid]
    var name        = app.users.names[pid] || u.shortString(pid, 6)
    var isSelf      = (pid == app.user.id)
    var isFollowing = social.follows(app.user.id, pid)
    var followsYou  = social.follows(pid, app.user.id)
    var hasFlagged  = social.flags(app.user.id, pid)
    var hasBlocked  = social.blocks(app.user.id, pid)
    var followers1  = social.followedFollowers(app.user.id, pid, true)
    var followers2  = social.unfollowedFollowers(app.user.id, pid)
    var followeds   = social.followeds(pid)
    var flaggers    = social.followedFlaggers(app.user.id, pid, true)

    // name conflict controls
    var nameConflictDlg
    var nameConflicts = []
    for (var id in app.users.names) {
      if (id != pid && app.users.names[id] == app.users.names[pid])
        nameConflicts.push(id)
    }
    if (nameConflicts.length) {
      // :TODO:
      // nameConflictDlg = h('.well.white', { style: 'margin: -10px 15px 15px' },
      //   h('p', { style: 'margin-bottom: 10px' }, h('strong', 'Other users named "'+app.users.names[pid]+'":')),
      //   h('ul.list-inline', nameConflicts.map(function (id) { return h('li', com.user(id)) })),
      //   h('p', h('small', 'ProTip: You can rename users to avoid getting confused!'))
      // )
    }

    // flag controls
    var flagMsgs
    if (flaggers.length) {
      // :TODO:
      // flagMsgs = h('.profile-flags.message-feed')
      // flaggers.forEach(function (id) {
      //   var flag = social.flags(id, pid)
      //   if (flag.reason && flag.key) {
      //     app.ssb.get(flag.key, function (err, flagMsg) {
      //       if (err) console.error(err)
      //       if (flagMsg) flagMsgs.appendChild(com.message({ key: flag.key, value: flagMsg }))
      //     })
      //   }
      // })
    }

    return  <div className="user-info">
      <div><img src={app.profilePicUrl(pid)} /></div>
      <div>
        <div>
          <h1>{name}</h1>
          {(isSelf) ?
            <Link to="/setup">Edit Profile</Link> :
            <span>
              {(hasBlocked) ? 'BLOCKED' : <a onclick={this.props.onToggleFollow}>{(isFollowing) ? ' Unfollow' : ' Follow'}</a>}{' '}
              <a onclick={this.props.onRename}>Rename</a>{' '}
              <a onclick={this.props.onToggleFlag}>{(!!hasFlagged) ? 'Unflag' : 'Flag'}</a>
            </span>
          }
        </div>
        <div>
          {followers1.length + followers2.length} followers ({followers1.length} mutual) {flaggers.length} flags
        </div>
      </div>
    </div>
  }
}