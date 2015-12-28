'use babel'
import React from 'react'
import { Link } from 'react-router'
import app from '../lib/app'

export default class LeftNav extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      indexCounts: app.indexCounts,
      channels: app.channels || []
    }

    // watch for updates to global state
    this.refresh = () => {
      this.setState({ channels: app.channels, indexCounts: app.indexCounts })
    }
    app.on('update:channels', this.refresh)
    app.on('update:indexCounts', this.refresh)
  }
  componentWillUnmount() {
    app.removeListener('update:channels', this.refresh)
    app.removeListener('update:indexCounts', this.refresh)
  }

  render() {
    // predicates
    const isPinned = b => channel => (!!channel.pinned == b)
    
    // lists
    const pinnedChannels = this.state.channels.filter(isPinned(true))

    // render
    const NavHeading = props => {
      return <div className="leftnav-heading">{props.children}</div>
    }
    const NavLink = props => {
      return <div className="leftnav-link">
        <Link to={props.to} className={this.props.location.pathname === props.to ? 'selected' : ''}>{props.children}</Link>
      </div>
    }
    const renderChannel = c => <NavLink to={'/newsfeed/channel/'+c.name}><i className="fa fa-hashtag" /> {c.name}</NavLink>
    return <div className="leftnav">
      <NavLink to="/"><i className="fa fa-bullhorn" /> Public</NavLink>
      <NavLink to="/inbox"><i className="fa fa-inbox" /> Private ({this.state.indexCounts.inboxUnread})</NavLink>
      <NavLink to="/notifications"><i className="fa fa-bell" /> Notifications ({this.state.indexCounts.notificationsUnread})</NavLink>
      <NavLink to="/bookmarks"><i className="fa fa-bookmark" /> Bookmarked ({this.state.indexCounts.bookmarksUnread})</NavLink>
      <NavLink to="/sync"><i className="fa fa-users" /> Friends</NavLink>
      <NavHeading>Channels</NavHeading>
      { pinnedChannels.map(renderChannel) }
      <NavLink to="/channels">Find more...</NavLink>
    </div>
  }
}