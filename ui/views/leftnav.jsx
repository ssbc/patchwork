'use babel'
import React from 'react'
import { Link } from 'react-router'

class NavLink extends React.Component {
  render() {
    return <div>
      <Link to={this.props.to}>{this.props.children}</Link>
    </div>
  }
}

export default class LeftNav extends React.Component {
  render() {
    return <div>
      <NavLink to="/">Feed</NavLink>
      <NavLink to="/inbox">Inbox</NavLink>
      <NavLink to="/starred">Starred</NavLink>
      <NavLink to="/friends">Friends</NavLink>
      <NavLink to="/sync">Sync</NavLink>
    </div>
  }
}