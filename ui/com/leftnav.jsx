'use babel'
import React from 'react'
import { Link } from 'react-router'
import app from '../lib/app'

export default class LeftNav extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      channels: app.channels || []
    }

    // watch for updates to the channels
    app.on('update:channels', (this.onUpdateChannels = () => this.setState({ channels: app.channels })))
  }
  componentWillUnmount() {
    app.removeListener('update:channels', this.onUpdateChannels)
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
      <NavLink to="/"><i className="fa fa-newspaper-o" /> Feed</NavLink>
      <NavLink to="/inbox"><i className="fa fa-inbox" /> Inbox</NavLink>
      <NavLink to="/bookmarks"><i className="fa fa-bookmark" /> Bookmarks</NavLink>
      <NavLink to="/sync"><i className="fa fa-users" /> Friends</NavLink>
      <NavHeading>Channels</NavHeading>
      { pinnedChannels.map(renderChannel) }
      <NavLink to="/channels">Find more...</NavLink>
    </div>
  }
}