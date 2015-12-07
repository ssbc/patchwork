'use babel'
import React from 'react'
import app from './lib/app'
import LeftNav from './views/leftnav'
import ComposerSidePanel from './views/composer-sidepanel'
import Notifications from './com/msg-list/notifications'
import ModalFlow from './com/modals/flow'
import ProfileSetup from './com/forms/profile-setup'
import FollowNearby from './com/forms/follow-nearby'
import PubInvite from './com/forms/pub-invite'

const SETUP_LABELS = [<i className="fa fa-user"/>, <i className="fa fa-wifi"/>, <i className="fa fa-cloud"/>]
const SETUP_FORMS = [ProfileSetup, FollowNearby, PubInvite]

export default class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.buildState()

    // listen for app change-events that should update our state
    app.on('update:all', () => { this.setState(this.buildState()) })
    app.on('update:isComposerOpen', () => { this.setState(this.buildState()) })
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
      isWifiMode: app.isWifiMode,
      user: app.user,
      users: app.users,
      setupIsOpen: app.user.needsSetup,
      setupCantClose: app.user.needsSetup,
      isComposerOpen: app.isComposerOpen
    }
  }
  toggleComposerOpen() {
    app.isComposerOpen = !app.isComposerOpen
    app.emit('update:isComposerOpen', app.isComposerOpen)
  }
  
  render() {
    const composing = this.state.isComposerOpen
    return <div className="layout-rows">
      <ModalFlow fullheight labels={SETUP_LABELS} Forms={SETUP_FORMS} isOpen={this.state.setupIsOpen} cantClose={this.state.setupCantClose} />
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
        <div id="rightnav"><Notifications /></div>
      </div>
      <ComposerSidePanel isOpen={this.state.isComposerOpen} />
    </div>
  }
}