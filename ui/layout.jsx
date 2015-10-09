'use babel'
import React from 'react'
import app from './lib/app'
import TopNav from './views/topnav'
import LeftNav from './views/leftnav'

export default class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = { user: app.user, users: app.users }

    // listen for app change-events that should update our state
    app.on('update:all', () => { this.setState({ user: app.user, users: app.users }) })
  }
  componentWillReceiveProps() {
    // update state on view changes
    app.fetchLatestState()
  }
  render() {
    return <div className="layout-rows">
      <TopNav />
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