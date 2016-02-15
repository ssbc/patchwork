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
import { AutoRefreshingComponent, UserLink, UserPic, UserBtn, HoverShifter } from '../index'
import UserSummary from './summary'
import app from '../../lib/app'
import u from '../../lib/util'
import social from '../../lib/social-graph'

export class Header extends AutoRefreshingComponent {
  constructor(props) {
    super(props)

    // event handlers
    this.on = {
      toggleFollow: () => {
        if (this.state.isSelf) return
        // publish contact msg
        let msg = (this.state.isFollowing) ? schemas.unfollow(this.props.pid) : schemas.follow(this.props.pid)
        app.ssb.publish(msg, (err) => {
          if (err) return app.issue('Failed to publish contact msg', err, 'Profile view onToggleFollow')
          app.fetchLatestState()
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
          { this.state.isSelf
            ? <div>This is you!</div>
            : <div>
                <a href="javascript:" onClick={this.on.toggleFollow} className="btn">
                  { this.state.isFollowing && this.state.followsYou
                    ? <HoverShifter>
                        <span><i className="fa fa-check" /> In your contacts</span>
                        <span><i className="fa fa-times" /> Stop following</span>
                      </HoverShifter>
                    : '' }
                  { this.state.isFollowing && !this.state.followsYou
                    ? <HoverShifter>
                        <span><i className="fa fa-user-plus" /> Request pending</span>
                        <span><i className="fa fa-times" /> Stop following</span>
                      </HoverShifter>
                    : '' }
                  { !this.state.isFollowing && this.state.followsYou
                    ? <HoverShifter>
                        <span><i className="fa fa-user-plus" /> Wants to connect</span>
                        <span><i className="fa fa-plus" /> Add to contacts</span>
                      </HoverShifter>
                    : '' }
                  { !this.state.isFollowing && !this.state.followsYou
                    ? <HoverShifter>
                        <span><i className="fa fa-plus" /> Add to contacts</span>
                        <span><i className="fa fa-plus" /> Start following</span>
                      </HoverShifter>
                    : '' }
                </a>
                <a href="javascript:" className="btn compose-btn"><i className="fa fa-pencil" /> Send Message</a>
              </div> }
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
    return {
      profile: app.users.profiles[pid],
      flaggers: social.followedFlaggers(app.user.id, pid, true)
    }
  }
  render() {
    const pid = this.props.pid
    const flaggers = this.state.flaggers
    if (flaggers.length === 0)
      return <span />
    return <div>
      <hr className="labeled" data-label="warnings" />
      { flaggers.map(flagger => {
        const flag = this.state.profile.flaggers[flagger]

        let reasonLabel
        if      (flag.reason === 'spam')  reasonLabel = 'Warning! This account is a spammer.'
        else if (flag.reason === 'abuse') reasonLabel = 'Warning! This account is abusive.'
        else if (flag.reason === 'dead')  reasonLabel = 'Warning! This account has been discontinued.'
        else if (flag.reason)             reasonLabel = flag.reason
        else                              reasonLabel = 'Flagged for personal reasons.'

        const onClick = () => app.history.pushState(null, '/msg/'+encodeURIComponent(flag.msgKey))   
        return <div className="msg-view oneline" onClick={onClick}>
          <div className="authors">
            <UserPic id={flagger} />
            <UserLink id={flagger} />
          </div>
          <div className="content"><i className="fa fa-flag" /> {reasonLabel}</div>
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
    return {
      profile: app.users.profiles[pid],
      expandedImageLink: this.state ? this.state.expandedImageLink : false,
      currentImageLink: u.profilePicRef(pid)
    }
  }
  onSelectImage(image) {
    app.ssb.publish(schemas.image(this.props.pid, image), err => {
      if (err)
        return app.issue('Failed to Update Image', err, 'This error occurred while using an image chosen by someone else')
      app.fetchLatestState()
    })    
  }
  static ExpandedInfo(props) {
    const isMe = props.profile.id === app.user.id 
    const images = props.profile.images[props.expandedImageLink]

    // is what the user chose for themselves
    const isSelfAssigned = (getLinkRef(props.profile.self.image) === props.expandedImageLink)

    // is an image that I've explicitly chosen for them
    const isMyChosenImage = (props.expandedImageLink == (isMe ? getLinkRef(props.profile.self.image) : getLinkRef(props.profile.byMe.image)))

    // is the image currently in use
    const isCurrentImage = (props.currentImageLink === props.expandedImageLink)
    
    // users (followed and unfollowed) that have chosen this image
    const followedUsers = images.filter(id => id !== props.profile.id && id !== app.user.id && social.follows(app.user.id, id))
    const unfollowedUsers = images.filter(id => id !== props.profile.id && id !== app.user.id && !social.follows(app.user.id, id))
    const followedUsersNames = followedUsers.map(id => u.getName(id)).join(', ')
    const unfollowedUsersNames = unfollowedUsers.map(id => u.getName(id)).join(', ')

    return <div className="expanded-card-info">
      { isSelfAssigned ? <div><strong>Default image (self-assigned)</strong></div> : '' }
      { (isMyChosenImage || followedUsers.length || unfollowedUsers.length)
        ? <div>Chosen by:
            <ul>
              { followedUsers.length ? <li><span className="hint--bottom" data-hint={followedUsersNames}>{followedUsers.length} users you follow</span></li> : '' }
              { unfollowedUsers.length ? <li><span className="hint--bottom" data-hint={unfollowedUsersNames}>{unfollowedUsers.length} users you {"don't"} follow</span></li> : '' }
              { isMyChosenImage ? <li><strong>You</strong></li> : '' }
            </ul>
          </div>
        : '' }
      { !isCurrentImage ? <div><a href="javascript:" className="btn" onClick={()=>props.onSelectImage(props.expandedImageLink)}>Use This Image</a></div> : '' }
    </div>
  }
  render() {
    if (!this.state.profile)
      return <span/>
    const isMe = this.state.profile.id === app.user.id 
    const expanded = this.state.expandedImageLink
    const current = this.state.currentImageLink
    const onSelect = image => () => this.setState({ expandedImageLink: (image == this.state.expandedImageLink) ? false : image })
    const renderImage = image => {
      return <div key={image} className={`card pic ${image==current?'current':''} ${image==expanded?'expanded':''}`} onClick={onSelect(image)}>
        <img src={'/'+image} />
        { this.state.expandedImageLink == image ? <Pics.ExpandedInfo {...this.state} onSelectImage={this.onSelectImage.bind(this)} /> : '' }
      </div>
    }
    return <div>
      <hr className="labeled" data-label="pictures" />
      <div className="user-info-cards">
        { Object.keys(this.state.profile.images).map(renderImage) }
        <div className="add-new pic">
          <ModalBtn className="fullheight" Form={ProfileImage} formProps={{id: this.props.pid}} nextLabel="Publish">
            <h2><i className="fa fa-plus"/> new pic</h2>
          </ModalBtn>
        </div>
      </div>
    </div>
  }
}

// helper to get the ref of a link, if it exists
function getLinkRef(link) {
  return (link) ? link.link : false
}

export class Data extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props ? props.pid : this.props.pid
    return { pid }
  }
  render() {
    return <div>
      <hr className="labeled" data-label="data" />
      <div className="user-info-cards">
        <div className="card data"><span>Public Key</span> <code>{this.props.pid}</code></div>
      </div>
    </div>
  }
}