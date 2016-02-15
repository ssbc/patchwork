'use babel'
import React from 'react'
import { Link } from 'react-router'
import schemas from 'ssb-msg-schemas'
import multicb from 'multicb'
import Tabs from '../tabs'
import ModalBtn from '../modals/btn'
import Rename from '../forms/rename'
import ProfileName from '../forms/profile-name'
import ProfileImage from '../forms/profile-image'
import { AutoRefreshingComponent, UserLink, UserPic, UserBtn } from '../index'
import UserSummary from './summary'
import DropdownBtn from '../dropdown'
import mentionslib from '../../lib/mentions'
import app from '../../lib/app'
import u from '../../lib/util'
import social from '../../lib/social-graph'

const FLAG_DROPDOWN = [
  { value: 'spam',  label: <span><i className="fa fa-flag" /> Spammer</span> },
  { value: 'abuse', label: <span><i className="fa fa-flag" /> Abusive</span> },
  { value: false,   label: <span><i className="fa fa-flag" /> Personal reasons</span> }
]

export class Header extends AutoRefreshingComponent {
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
      contacts:    social.contacts(pid),
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

    const ncontacts = this.state.contacts.length
    const nflaggers = this.state.flaggers.length
    return <div className="user-info">
      <div className="avatar">
        <img src={u.profilePicUrl(this.props.pid)} />
      </div>
      <div className="info">
        <div className="info-inner">
          <h1>{this.state.name}</h1> 
          <div>
            <a className="btn"><i className="fa fa-check" /> In your contacts</a>
            <a className="btn compose-btn"><i className="fa fa-pencil" /> Send Message</a>
          </div>
          <div>{ncontacts} contact{ncontacts===1?'':'s'}</div>
        </div>
        <Tabs options={this.props.tabs} selected={this.props.currentTab} onSelect={this.props.onSelectTab} />
        {''/*<pre><code>{this.props.pid}</code></pre>*/}
        {''/*<div>
          {(this.state.isSelf) ?
            <span className="btn-group">
              <ModalBtn className="btn fullheight" Form={ProfileName} nextLabel="Publish"><i className="fa fa-wrench" /> Edit Name</ModalBtn>
              <ModalBtn className="btn fullheight" Form={ProfileImage} nextLabel="Publish"><i className="fa fa-wrench" /> Edit Image</ModalBtn>
            </span> :
            <span className="btn-group">
              { (this.state.hasFlagged) ?
                <span className="btn disabled">Blocked</span> :
                <a className="btn"
                  onClick={this.on.toggleFollow}>
                  {(this.state.isFollowing) ?
                    <span><i className="fa fa-user-times" /> Unfollow</span> :
                    <span><i className="fa fa-user-plus" /> Follow</span> }
                </a> }
              { (this.state.hasFlagged) ?
                <a className="btn" onClick={this.on.unflag}><i className="fa fa-times" /> Unflag</a> :
                <DropdownBtn className="btn" items={FLAG_DROPDOWN} right onSelect={this.on.flag}><i className="fa fa-flag" /> Flag</DropdownBtn>  }
            </span>
          }
        </div>*/}
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

export class Contacts extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return { contacts: social.contacts(pid).sort(sortFollowedFirst) }
  }
  render() {
    return <div>
      {this.state.contacts.length ? '' : <em>No contacts found.</em>}
      {this.state.contacts.map(id => <UserSummary key={id} pid={id} />)}
    </div>
  }
}


export class Flags extends AutoRefreshingComponent {
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
        const flagMsg = app.users.profiles[pid].flaggers[userId]
        const r = flagMsg.reason||'other'
        flagsGroupedByReason[r] = flagsGroupedByReason[r] || []
        flagsGroupedByReason[r].push(userId)
      } catch (e) {}
    })
    return <div>
      <hr className="labeled" data-label="warnings" />
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

export class Names extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return {
      profile: app.users.profiles[pid],
      expandedName: this.state ? this.state.expandedName : false,
      currentName: u.getName(pid)
    }
  }
  onSelectName(name) {
    app.ssb.publish(schemas.name(this.props.pid, name), err => {
      if (err)
        return app.issue('Failed to Update Name', err, 'This error occurred while using a name chosen by someone else')
      app.fetchLatestState()
    })    
  }
  static ExpandedInfo(props) {
    const isMe = props.profile.id === app.user.id 
    const names = props.profile.names[props.expandedName]

    // is what the user chose for themselves
    const isSelfAssigned = (props.profile.self.name === props.expandedName)

    // is a name that I've explicitly chosen for them
    const isMyChosenName = (props.expandedName == (isMe ? props.profile.self.name : props.profile.byMe.name))

    // is the name currently in use
    const isCurrentName = (props.currentName === props.expandedName)
    
    // users (followed and unfollowed) that have chosen this name
    const followedUsers = names.filter(id => id !== props.profile.id && id !== app.user.id && social.follows(app.user.id, id))
    const unfollowedUsers = names.filter(id => id !== props.profile.id && id !== app.user.id && !social.follows(app.user.id, id))
    const followedUsersNames = followedUsers.map(id => u.getName(id)).join(', ')
    const unfollowedUsersNames = unfollowedUsers.map(id => u.getName(id)).join(', ')

    return <div className="expanded-card-info">
      <h1>{props.expandedName}</h1>
      { isSelfAssigned ? <div><strong>Default name (self-assigned)</strong></div> : '' }
      { (isMyChosenName || followedUsers.length || unfollowedUsers.length)
        ? <div>Chosen by:
            <ul>
              { followedUsers.length ? <li><span className="hint--bottom" data-hint={followedUsersNames}>{followedUsers.length} users you follow</span></li> : '' }
              { unfollowedUsers.length ? <li><span className="hint--bottom" data-hint={unfollowedUsersNames}>{unfollowedUsers.length} users you {"don't"} follow</span></li> : '' }
              { isMyChosenName ? <li><strong>You</strong></li> : '' }
            </ul>
          </div>
        : '' }
      { !isCurrentName ? <div><a href="javascript:" className="btn" onClick={()=>props.onSelectName(props.expandedName)}>Use This Name</a></div> : '' }
    </div>
  }
  render() {
    if (!this.state.profile)
      return <span/>
    const isMe = this.state.profile.id === app.user.id 
    const expanded = this.state.expandedName
    const current = this.state.currentName
    const onSelect = name => () => this.setState({ expandedName: (name == this.state.expandedName) ? false : name })
    const renderName = name => {
      return <div key={name} className={`card name ${name==current?'current':''} ${name==expanded?'expanded':''}`} onClick={onSelect(name)}>
        <h2>{name}</h2>
        { this.state.expandedName == name ? <Names.ExpandedInfo {...this.state} onSelectName={this.onSelectName.bind(this)} /> : '' }
      </div>
    }
    return <div>
      <hr className="labeled" data-label="names" />
      <div className="user-info-cards">
        { Object.keys(this.state.profile.names).map(renderName) }
        <div className="add-new name">
          <ModalBtn className="fullheight" Form={isMe ? ProfileName : Rename} formProps={{id: this.props.pid}} nextLabel="Publish">
            <h2><i className="fa fa-plus"/> new name</h2>
          </ModalBtn>
        </div>
      </div>
    </div>
  }
}

export class Pics extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return { profile: app.users.profiles[pid] }
  }
  render() {
    if (!this.state.profile)
      return <span/>
    return <div>
      <hr className="labeled" data-label="pictures" />
      <div className="user-info-cards">
        { Object.keys(this.state.profile.images).map(image => <div key={image} className="card pic"><img src={'/'+image} /></div>) }
        <div className="add-new pic"><h2><i className="fa fa-plus"/> new pic</h2></div>
      </div>
    </div>
  }
}

export class Data extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return { pid }
  }
  render() {
    if (!this.state.profile)
      return <span/>
    return <div>
      <hr className="labeled" data-label="data" />
      <div className="user-info-cards">
        <div className="card data"><span>Public Key</span> <code>{this.props.pid}</code></div>
      </div>
    </div>
  }
}