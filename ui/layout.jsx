'use babel'
import React from 'react'
import app from './lib/app'
import LeftNav from './views/leftnav'
import Notifications from './com/msg-list/notifications'
import Bookmarks from './com/msg-list/bookmarks'
import ModalFlow from './com/modals/flow'
import ProfileSetup from './com/forms/profile-setup'
import FollowNearby from './com/forms/follow-nearby'
import PubInvite from './com/forms/pub-invite'

const SETUP_LABELS = [<i className="fa fa-user"/>, <i className="fa fa-wifi"/>, <i className="fa fa-cloud"/>]
const SETUP_FORMS = [ProfileSetup, FollowNearby, PubInvite]
const RIGHT_NAVS = {
  notifications: Notifications,
  bookmarks: Bookmarks
}

export default class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.buildState()

    // listen for app change-events that should update our state
    app.on('update:all', () => { this.setState(this.buildState()) })
    app.on('update:isWifiMode', () => { this.setState(this.buildState()) })
    app.on('modal:setup', (isOpen) => this.setState({ setupIsOpen: isOpen }))
  }
  componentWillReceiveProps() {
    // update state on view changes
    app.fetchLatestState()
  }
  buildState() {
    // copy over app state
    return {
      rightColumn: (this.state) ? this.state.rightColumn : false,
      isWifiMode: app.isWifiMode,
      user: app.user,
      users: app.users,
      setupIsOpen: app.user.needsSetup,
      setupCantClose: app.user.needsSetup,
      isComposerOpen: app.isComposerOpen
    }
  }

  toggleRightNav(id) {
    if (this.state.rightColumn == id)
      this.setState({ rightColumn: false })
    else
      this.setState({ rightColumn: id })
  }

  onClickBack() {
    window.history.back()
  }
  
  render() {
    const onToggleRightNav = (id) => () => {
      this.toggleRightNav(id)
    }
    const composing = this.state.isComposerOpen
    const RightNavView = (this.state.rightColumn) ? RIGHT_NAVS[this.state.rightColumn] : null
    return <div className="layout-rows">
      <ModalFlow fullheight labels={SETUP_LABELS} Forms={SETUP_FORMS} isOpen={this.state.setupIsOpen} cantClose={this.state.setupCantClose} />
      <div className="toolbar flex">
        <div className="flex-fill">
          <a className="ctrl back" onClick={this.onClickBack}><i className="fa fa-angle-left" /></a>
        </div>
        <div>
          <div className="search"><i className="fa fa-search" /><input /></div>
          <a className="ctrl" onClick={onToggleRightNav('bookmarks')}><i className="fa fa-bookmark-o" /></a>
          <a className="ctrl" onClick={onToggleRightNav('notifications')}><i className="fa fa-bell-o" /></a>
        </div>
      </div>
      <div className="layout-columns">
        <LeftNav
          location={this.props.location.pathname}
          isWifiMode={this.state.isWifiMode}
          userid={this.state.user.id}
          names={this.state.users.names}
          friends={this.state.user.friends}
          following={this.state.user.nonfriendFolloweds}
          followers={this.state.user.nonfriendFollowers} />
        <div id="mainview">{this.props.children}</div>
        { (RightNavView) ? <div id="rightnav"><RightNavView /></div> : '' }
      </div>
    </div>
  }
}