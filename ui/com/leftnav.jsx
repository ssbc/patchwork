'use babel'
import React from 'react'
import { Link } from 'react-router'
import { ChannelList } from './channel-list'
import Issues from './issues'
import app from '../lib/app'

export default class LeftNav extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      indexCounts: app.indexCounts,
      channels: app.channels || [],
      isChannelListOpen: false
    }

    // watch for updates to global state
    this.refresh = () => {
      this.setState({ channels: app.channels, indexCounts: app.indexCounts })
    }
    app.on('update:channels', this.refresh)
    app.on('update:indexCounts', this.refresh)

    // close channel popup on click outside of it
    this.maybeCloseChannels = (e) => {
      if (!this.state.isChannelListOpen)
        return
      // is the click within the channel list?
      for (var i=0; i < e.path.length; i++) {
        if (e.path[i].classList && e.path[i].classList.contains('channel-list'))
          return // keep open
      }
      // close, this was a click out of the channel list
      this.setState({ isChannelListOpen: false })
    }
    document.addEventListener('click', this.maybeCloseChannels)
  }
  componentWillUnmount() {
    app.removeListener('update:channels', this.refresh)
    app.removeListener('update:indexCounts', this.refresh)
    document.removeEventListener('click', this.maybeCloseChannels)
  }

  onOpenChannelList(e) {
    this.setState({ isChannelListOpen: true })
    e.nativeEvent.stopImmediatePropagation()
  }
  onSelectChannel(channel) {
    this.setState({ isChannelListOpen: false })
    app.history.pushState(null, '/newsfeed/channel/' + encodeURIComponent(channel.name))
  }

  render() {
    const pathname = this.props.location && this.props.location.pathname

    // predicates
    const isPinned = b => channel => (!!channel.pinned == b)
    
    // lists
    const pinnedChannels = this.state.channels.filter(isPinned(true))

    // render
    const NavHeading = props => {
      return <div className="leftnav-heading">{props.children}</div>
    }
    const NavLink = props => {
      return <div className={'leftnav-link '+(props.className||'')+(pathname === props.to ? ' selected' : '')}>
        <Link to={props.to}>{props.children}</Link>
      </div>
    }
    const renderChannel = c => <NavLink key={c.name} to={'/newsfeed/channel/'+c.name}><i className="fa fa-hashtag" /> {c.name}</NavLink>
    return <div className="leftnav">
      <NavLink className="compose-btn" to="/composer">Compose</NavLink>
      <NavLink to="/"><i className="fa fa-bullhorn" /> Public</NavLink>
      <NavLink to="/inbox"><i className="fa fa-inbox" /> Private ({this.state.indexCounts.inboxUnread})</NavLink>
      <NavLink to="/bookmarks"><i className="fa fa-bookmark" /> Bookmarked ({this.state.indexCounts.bookmarksUnread})</NavLink>
      <NavLink to="/sync"><i className="fa fa-users" /> People</NavLink>
      <Issues/>
      { this.props.children ? <NavHeading>{this.props.title||'This Page'}</NavHeading> : '' }
      { this.props.children }
      <NavHeading>Channels</NavHeading>
      { pinnedChannels.map(renderChannel) }
      <div className="leftnav-link">
        <a onClick={this.onOpenChannelList.bind(this)}>Find more...</a>
        { this.state.isChannelListOpen ? <i className="fa fa-caret-left" style={{ color: 'gray' }} /> : '' }
      </div>
      { this.state.isChannelListOpen ? <ChannelList channels={this.state.channels} onSelect={this.onSelectChannel.bind(this)} /> : '' }
    </div>
  }
}