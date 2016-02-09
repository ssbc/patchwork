'use babel'
import React from 'react'
import { Link } from 'react-router'
import { ChannelList } from './channel-list'
import Issues from './issues'
import app from '../lib/app'
import u from '../lib/util'

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
      for (var el = e.target; el; el = el.parentNode) {
        if (el.classList && el.classList.contains('channel-list'))
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
    app.history.pushState(null, '/public/channel/' + encodeURIComponent(channel.name))
  }

  static Heading (props) {
    return <div className="leftnav-heading">{props.children}</div>
  }
  static Link (props) {
    return <div className={'leftnav-link '+(props.className||'')+(props.pathname === props.to ? ' selected' : '')}>
      <Link to={props.to}>{props.children}</Link>
    </div>
  }

  render() {
    const pathname = this.props.location && this.props.location.pathname

    // predicates
    const isPinned = b => channel => (!!channel.pinned == b)
    
    // lists
    const pinnedChannels = this.state.channels.filter(isPinned(true))
    const contacts = app.user.friends.map(id => ({ id: id, name: u.getName(id) })).sort((a, b) => a.name.localeCompare(b.name))

    // render
    const renderChannel = c => <LeftNav.Link pathname={pathname} key={c.name} to={'/public/channel/'+c.name}><i className="fa fa-hashtag" /> {c.name}</LeftNav.Link>
    const renderContact = c => <LeftNav.Link pathname={pathname} key={c.id} to={'/profile/'+encodeURIComponent(c.id)}><i className="fa fa-user" /> {c.name}</LeftNav.Link>
    return <div className="leftnav">
      <LeftNav.Link pathname={pathname} to="/"><i className="fa fa-comment-o" /> All talk</LeftNav.Link>
      <LeftNav.Link pathname={pathname} to="/contacts"><i className="fa fa-users" /> Network</LeftNav.Link>
      <Issues/>
      <LeftNav.Heading>Inbox</LeftNav.Heading>
      <LeftNav.Link pathname={pathname} to="/private"><i className="fa fa-lock" /> Private ({app.indexCounts.privateUnread})</LeftNav.Link>
      <LeftNav.Link pathname={pathname} to="/bookmarks"><i className="fa fa-bookmark" /> Bookmarked ({app.indexCounts.bookmarkUnread})</LeftNav.Link>
      <LeftNav.Link pathname={pathname} to="/mentions"><i className="fa fa-at" /> Mentioned ({app.indexCounts.mentionUnread})</LeftNav.Link>
      <LeftNav.Link pathname={pathname} to="/follows"><i className="fa fa-user-plus" /> Follows ({app.indexCounts.followUnread})</LeftNav.Link>
      <LeftNav.Heading>Channels</LeftNav.Heading>
      { pinnedChannels.map(renderChannel) }
      <div className="leftnav-link">
        <a onClick={this.onOpenChannelList.bind(this)}>Find more...</a>
        { this.state.isChannelListOpen ? <i className="fa fa-caret-left" style={{ color: 'gray' }} /> : '' }
      </div>
      { this.state.isChannelListOpen ? <ChannelList channels={this.state.channels} onSelect={this.onSelectChannel.bind(this)} /> : '' }
      <LeftNav.Heading>Network</LeftNav.Heading>
      { contacts.map(renderContact) }
      <div className="leftnav-link"><Link to="/add-contact">Find more...</Link></div>
    </div>
  }
}