'use babel'
import React from 'react'
import { Link } from 'react-router'
import { RenameModalBtn, FlagUserModalBtn } from './modals'
import app from '../lib/app'
import u from '../lib/util'
import social from '../lib/social-graph'

export default class UserInfo extends React.Component {
  render() {
    // name conflict controls
    var nameConflictDlg
    var nameConflicts = []
    for (var id in app.users.names) {
      if (id != this.props.pid && app.users.names[id] == app.users.names[this.props.pid])
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
    if (this.props.flaggers.length) {
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
      <div>
        <img src={u.profilePicUrl(this.props.pid)} />
        <div>
          {(this.props.isSelf) ?
            <a className="btn" onClick={()=>{app.emit('modal:setup', true)}}><i className="fa fa-wrench" /> Edit Profile</a> :
            <span className="btn-group">
              { (this.props.hasBlocked) ?
                'BLOCKED' :
                <a className="btn"
                  onClick={this.props.onToggleFollow}>
                  {(this.props.isFollowing) ?
                    <span><i className="fa fa-user-times" /> Unfollow</span> :
                    <span><i className="fa fa-user-plus" /> Follow</span> }
                </a> }
              <RenameModalBtn name={this.props.name} onSubmit={this.props.onRename} className="btn" />
              { (!this.props.hasFlagged) ?
                <FlagUserModalBtn name={this.props.name} onSubmit={this.props.onFlag} className="btn" /> :
                <a className="btn" onClick={this.props.onUnflag}>Unflag</a> }
            </span>
          }
        </div>
      </div>
      <div>
        <h1>{this.props.name}</h1>
        <table>
          <tr><td>{this.props.followers1.length + this.props.followers2.length}</td><td>followers</td></tr>
          {(this.props.isSelf) ? '' : <tr className="muted"><td>{this.props.followers1.length}</td><td>followed by you</td></tr>}
          <tr><td>{this.props.flaggers.length}</td><td>flags</td></tr>
        </table>
      </div>
    </div>
  }
}