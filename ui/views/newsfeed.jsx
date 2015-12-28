'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import cls from 'classnames'
import { LocalStoragePersistedComponent } from '../com'
import LeftNav from '../com/leftnav'
import Dipswitch from '../com/form-elements/dipswitch'
import Tabs from '../com/tabs'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import Summary from '../com/msg-view/summary'
import Thread from '../com/msg-thread'
import { ALL_CHANNELS, ChannelList } from '../com/channel-list'
import * as HelpCards from '../com/help/cards'
import app from '../lib/app'
import social from '../lib/social-graph'

const LISTITEMS = [
  { label: <span>Feed-style</span>, Component: Card },
  { label: <span>Inbox-style</span>, Component: Summary }
]
const LISTITEM_CARD = LISTITEMS[0]
const LISTITEM_ONELINE = LISTITEMS[1]

// newsfeed view
export default class NewsFeed extends LocalStoragePersistedComponent {
  constructor(props) {
    super(props, 'newsfeedState', {
      isToolbarOpen: true,
      listItemIndex: 0,
      isFollowedOnly: true,
      isUsingThreadPanel: false,
      currentThreadKey: null
    })

    // watch for open:msg events
    app.on('open:msg', (this.onOpenMsg = key => {
      if (this.state.isUsingThreadPanel) {
        // show in the panel
        this.setState({ currentThreadKey: key })
      } else {
        // navigate
        app.history.pushState(null, '/msg/' + encodeURIComponent(key))
      }      
    }))
  }
  componentWillUnmount() {
    app.removeListener('open:msg', this.onOpenMsg)
  }

  // ui event handlers
  onToggleToolbar(b) {
    this.setState({ isToolbarOpen: b }, () => {
      this.refs.list.calcContainerHeight()
    })
  }
  onSelectListItem(listItem) {
    this.setState({ listItemIndex: LISTITEMS.indexOf(listItem) })
  }
  onToggleFollowedOnly(b) {
    this.setState({ isFollowedOnly: b }, () => {
      this.refs.list.reload()
    })
  }
  onToggleThreadPanel(b) {
    this.setState({ isUsingThreadPanel: b })
  }
  onTogglePinned() {
    const channel = this.props.params.channel
    if (!channel)
      return
    app.ssb.patchwork.toggleChannelPinned(channel, err => {
      if (err)
        app.issue('Failed to pin channel', err)
    })
  }

  render() {
    const channel = this.props.params.channel
    const channelData = channel && findChannelData(app.channels, channel)
    const listItem = LISTITEMS[1]//this.state.listItemIndex]
    const ListItem = listItem.Component

    // msg-list params
    const cursor = msg => {
      if (msg)
        return [msg.value.timestamp, msg.value.author]
    }
    const source = (opts) => {
      if (channel) 
        return app.ssb.patchwork.createChannelStream(channel, opts)
      return app.ssb.patchwork.createNewsfeedStream(opts)
    }
    const filter = msg => {
      if (this.state.isFollowedOnly)
        return followedOnlyFilter(msg)
      return true
    }

    // render right nav
    const RightNav = (props) => {    
      const isPinned = channelData && channelData.pinned
      const Ctrl = props => {
        return <div className="ctrl"><label><i className={'fa fa-'+props.icon} /> {props.label}</label>{props.children}</div>
      }
      return <div className="newsfeed-rightnav">
        <hr className="labeled" data-label="about" />
        <div className="about">
          <div><strong>{ channel ? <span><i className="fa fa-hashtag" /> {channel}</span> : 'All' }</strong></div>
          <div>Public messages by everyone { this.state.isFollowedOnly ? 'that you follow' : 'in your network' }.</div>
        </div>
        <hr className="labeled" data-label="config" />
        <div className="config">
          { channel
            ? <Ctrl icon="thumb-tack" label="Pin Channel:"><Dipswitch label={isPinned?"Yes":"No"} checked={isPinned} onToggle={this.onTogglePinned.bind(this)} /></Ctrl>
            : '' }
          <Ctrl icon="user" label="Show:"><Dipswitch label={this.state.isFollowedOnly?"Followed Only":"All Users"} checked={this.state.isFollowedOnly} onToggle={this.onToggleFollowedOnly.bind(this)} /></Ctrl>
          <Ctrl icon="hand-pointer-o" label="On Click:"><Dipswitch label={this.state.isUsingThreadPanel?"Preview Threads":"Open Threads"} checked={this.state.isUsingThreadPanel} onToggle={this.onToggleThreadPanel.bind(this)} /></Ctrl>
          <Ctrl icon="th-list" label="View Mode:"><Tabs vertical options={LISTITEMS} selected={listItem} onSelect={this.onSelectListItem.bind(this)} /></Ctrl>
        </div>
      </div>
    }

    // render content
    const thread = this.state.isUsingThreadPanel && this.state.currentThreadKey
    return <div id="newsfeed" key={channel||'*'}>
      <MsgList
        ref="list"
        threads
        composer composerProps={{isPublic: true, channel: channel, placeholder: 'Write a public post'+(channel?' on '+channel:'')}}
        dateDividers
        openMsgEvent
        filter={filter}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        ListItem={ListItem} listItemProps={{ userPic: true }}
        live={{ gt: [Date.now(), null] }}
        emptyMsg={(channel) ? ('No posts on "'+channel+'"... yet!') : 'Your newsfeed is empty.'}
        source={source}
        cursor={cursor} />
      { thread
        ? <Thread key={thread} id={thread} closeBtn live />
        : '' }
    </div>
  }
}

function followedOnlyFilter (msg) {
  return msg.value.author === app.user.id || social.follows(app.user.id, msg.value.author)
}

function findChannelData (channels, name) {
  for (var i=0; i < channels.length; i++) {
    if (channels[i].name === name)
      return channels[i]
  }
  return null
}