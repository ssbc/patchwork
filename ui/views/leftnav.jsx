'use babel'
import React from 'react'
import { Link } from 'react-router'

class NavLink extends React.Component {
  render() {
    var selected = (this.props.to === this.props.location)
    return <div className={'leftnav-item '+(selected?'selected':'')}>
      <Link to={this.props.to}>{this.props.children}</Link>
    </div>
  }
}

export default class LeftNav extends React.Component {
  render() {
    return <div>
      <NavLink to="/" location={this.props.location}>Forum</NavLink>
      <NavLink to="/inbox" location={this.props.location}>Inbox</NavLink>
      <NavLink to="/starred" location={this.props.location}>Starred</NavLink>
      <NavLink to="/friends" location={this.props.location}>Friends</NavLink>
      <NavLink to="/feed" location={this.props.location}>Data-Feed</NavLink>
      <NavLink to="/sync" location={this.props.location}>Sync</NavLink>
    </div>
  }
}