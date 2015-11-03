'use babel'
import React from 'react'
import app from './lib/app'
import LeftNav from './views/leftnav'
import { SetupModal } from './com/modals'

export default class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.buildState()

    // listen for app change-events that should update our state
    app.on('update:all', () => { this.setState(this.buildState()) })
    app.on('modal:setup', (isOpen) => this.setState({ setupIsOpen: isOpen }))
  }
  componentWillReceiveProps() {
    // update state on view changes
    app.fetchLatestState()
  }
  buildState() {
    return {
      user: app.user,
      users: app.users,
      setupIsOpen: app.user.needsSetup,
      setupCantClose: app.user.needsSetup
    }
  }
  render() {
    return <div className="layout-rows">
      <SetupModal isOpen={this.state.setupIsOpen} cantClose={this.state.setupCantClose} />
      <div className="layout-columns">
        <LeftNav
          location={this.props.location.pathname}
          userid={this.state.user.id}
          names={this.state.users.names}
          friends={this.state.user.friends}
          following={this.state.user.nonfriendFolloweds}
          followers={this.state.user.nonfriendFollowers} />
        <div id="mainview">{this.props.children}</div>
      </div>
    </div>
  }
}