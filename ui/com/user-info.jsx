'use babel'
import React from 'react'
import { Link } from 'react-router'
import schemas from 'ssb-msg-schemas'
import multicb from 'multicb'
import mentionslib from '../lib/mentions'
import { RenameModalBtn } from './modals'
import { UserLink, UserPic, UserBtn } from './index'
import DropdownBtn from './dropdown'
import app from '../lib/app'
import u from '../lib/util'
import social from '../lib/social-graph'

const FLAG_DROPDOWN = [
  { value: 'spam',  label: <span><i className="fa fa-flag" /> Spammer</span> },
  { value: 'abuse', label: <span><i className="fa fa-flag" /> Abusive</span> },
  { value: false,   label: <span><i className="fa fa-flag" /> Personal reasons</span> }
]

// helper to refresh state any time the main application state updates
// - this should be replaced -- the entire `app` construct is a bit much
class AutoRefreshingComponent extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.computeState()
    this.refreshState = props => this.setState(this.computeState(props))
  }
  componentDidMount() {
    app.on('update:all', this.refreshState) // re-render on app state updates
  }
  componentWillReceiveProps(newProps) {
    this.refreshState(newProps)
  }
  componentWillUnmount() {
    app.removeListener('update:all', this.refreshState)    
  }
  computeState(props) {
    // should be overwritten by sublcass
  }
}

export class UserInfoHeader extends AutoRefreshingComponent {
  constructor(props) {
    super(props)

    // helper to refresh state and render after making changes
    const reload = () => { app.fetchLatestState(this.refreshState.bind(this)) }

    // event handlers
    this.on = {
      toggleFollow: () => {
        if (this.state.isSelf) return
        // publish contact msg
        let msg = (this.state.isFollowing) ? schemas.unfollow(this.props.pid) : schemas.follow(this.props.pid)
        app.ssb.publish(msg, (err) => {
          if (err) return app.issue('Failed to publish contact msg', err, 'Profile view onToggleFollow')
          reload()
        })
      },
      rename: (name) => {
        if (name === this.state.name)
          return
        // publish about msg
        app.ssb.publish(schemas.name(this.props.pid, name), (err) => {
          if (err) return app.issue('Failed to publish about msg', err, 'Profile view onRename')
          reload()
        })
      },
      flag: (reason) => {
        // publish vote and contact messages
        const voteMsg = schemas.vote(this.props.pid, -1, reason)
        const contactMsg = schemas.block(this.props.pid)
        let done = multicb()
        app.ssb.publish(voteMsg, done())
        app.ssb.publish(contactMsg, done())
        done(err => {
          if (err)
            return app.issue('Failed to publish flag', err, 'Happened in on.flag of UserInfo')
          reload()
        })
      },
      unflag: (reason) => {
        // publish vote and contact messages
        const voteMsg = schemas.vote(this.props.pid, 0)
        const contactMsg = schemas.unblock(this.props.pid)
        let done = multicb()
        app.ssb.publish(voteMsg, done())
        app.ssb.publish(contactMsg, done())
        done(err => {
          if (err)
            return app.issue('Failed to publish update', err, 'Happened in on.unflag of UserInfo')
          reload()
        })
      }
    }
  }

  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return {
      profile:     app.users.profiles[pid],
      name:        app.users.names[pid] || u.shortString(pid, 6),
      isSelf:      (pid == app.user.id),
      isFollowing: social.follows(app.user.id, pid),
      followsYou:  social.follows(pid, app.user.id),
      hasFlagged:  social.flags(app.user.id, pid),
      hasBlocked:  social.blocks(app.user.id, pid),
      followers1:  social.followedFollowers(app.user.id, pid, true),
      followers2:  social.unfollowedFollowers(app.user.id, pid),
      followeds:   social.followeds(pid),
      flaggers:    social.followedFlaggers(app.user.id, pid, true)
    }
  }

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

    const nfollowers = this.state.followers1.length + this.state.followers2.length
    const nflaggers = this.state.flaggers.length
    return <div className="user-info">
      <div className="avatar">
        <img src={u.profilePicUrl(this.props.pid)} />
      </div>
      <div className="facts">
        <h1>{this.state.name}</h1>
        <pre><code>{this.props.pid}</code></pre>
        <div>
          {(this.state.isSelf) ?
            <a className="btn" onClick={()=>{app.emit('modal:setup', true)}}><i className="fa fa-wrench" /> Edit Profile</a> :
            <span className="btn-group">
              { (this.state.hasBlocked) ?
                <span className="btn disabled">Blocked</span> :
                <a className="btn"
                  onClick={this.on.toggleFollow}>
                  {(this.state.isFollowing) ?
                    <span><i className="fa fa-user-times" /> Unfollow</span> :
                    <span><i className="fa fa-user-plus" /> Follow</span> }
                </a> }
              <RenameModalBtn name={this.state.name} onSubmit={this.on.rename} className="btn" />
              { (this.state.hasBlocked) ?
                <a className="btn" onClick={this.on.unflag}><i className="fa fa-times" /> Unflag</a> :
                <DropdownBtn className="btn" items={FLAG_DROPDOWN} right onSelect={this.on.flag}><i className="fa fa-flag" /> Flag</DropdownBtn>  }
            </span>
          }
        </div>
        <table>
          <tbody>
            <tr><td>{nfollowers}</td><td>follower{nfollowers===1?'':'s'}</td></tr>
            <tr><td>{nflaggers}</td><td>flag{nflaggers===1?'':'s'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  }
}

function sortFollowedFirst (a, b) {
  // rank followed followers first
  const aFollowed = (app.user.id === a || social.follows(app.user.id, a)) ? 1 : 0
  const bFollowed = (app.user.id === b || social.follows(app.user.id, b)) ? 1 : 0
  return bFollowed - aFollowed  
}

export class UserInfoFollowers extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return { followers: social.followers(pid).sort(sortFollowedFirst) }
  }
  render() {
    return <div className="user-info-card">
      <h3>followers</h3>
      <div className="content">
        {this.state.followers.length ? '' : <em>No followers found.</em>}
        {this.state.followers.map((id, i) => <UserBtn key={'follower'+i} id={id} />)}
      </div>
    </div>
  }
}

export class UserInfoFolloweds extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return { followeds: social.followeds(pid).sort(sortFollowedFirst) }
  }
  render() {
    return <div className="user-info-card">
      <h3>following</h3>
      <div className="content">
        {this.state.followeds.length ? '' : <em>No follows published.</em>}
        {this.state.followeds.map((id, i) => <UserBtn key={'followed'+i} id={id} />)}
      </div>
    </div>
  }
}


export class UserInfoFlags extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return { flaggers: social.followedFlaggers(app.user.id, pid, true) }
  }
  render() {
    const pid = this.props.pid
    const flaggers = this.state.flaggers
    if (flaggers.length === 0)
      return <span />

    // split flags up into groups
    let flagsGroupedByReason = {}
    flaggers.forEach(userId => {
      try {
        const flagMsg = app.users.profiles[pid].assignedBy[userId].flagged
        const r = flagMsg.reason||'other'
        flagsGroupedByReason[r] = flagsGroupedByReason[r] || []
        flagsGroupedByReason[r].push(userId)
      } catch (e) {}
    })
    return <div className="user-info-card">
      { Object.keys(flagsGroupedByReason).map(reason => {
        let reasonLabel
        if      (reason === 'spam')  reasonLabel = 'spamming'
        else if (reason === 'abuse') reasonLabel = 'abusive behavior'
        else                         reasonLabel = 'personal reasons'
        return <div key={'flag-'+reason}>
          <h3>flagged for {reasonLabel} by</h3>
          <div className="content">
            {flagsGroupedByReason[reason].map((id, i) => <UserBtn key={'flag'+i} id={id} />)}
          </div>
        </div>
      }) }
    </div>
  }
}