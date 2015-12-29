'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import cls from 'classnames'
import { LocalStoragePersistedComponent } from '../com'
import LeftNav from '../com/leftnav'
import DropdownBtn from '../com/dropdown'
import Tabs from '../com/tabs'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import Oneline from '../com/msg-view/oneline'
import Summary from '../com/msg-view/summary'
import Thread from '../com/msg-thread'
import { ALL_CHANNELS, ChannelList } from '../com/channel-list'
import * as HelpCards from '../com/help/cards'
import app from '../lib/app'
import social from '../lib/social-graph'

const LISTITEMS = [
  { label: <span><i className="fa fa-list"/> View: Inline</span>, Component: Card },
  { label: <span><i className="fa fa-list"/> View: Large</span>, Component: Summary },
  { label: <span><i className="fa fa-list"/> View: Compact</span>, Component: Oneline }
]
const LISTITEM_CARD = LISTITEMS[0]
const LISTITEM_ONELINE = LISTITEMS[1]

// newsfeed view
export default class NewsFeed extends LocalStoragePersistedComponent {
  constructor(props) {
    super(props, 'msgList', {
      currentMsgView: 0
    })
    this.state.channels = app.channels || []

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
    this.refresh = () => {
      this.setState({ channels: app.channels })
    }
    app.on('update:channels', this.refresh)
  }
  componentWillUnmount() {
    app.removeListener('update:channels', this.refresh)
    app.removeListener('open:msg', this.onOpenMsg)
  }

  // ui event handlers
  onSelectMsgView(v, index) {
    console.log(v, index)
    this.setState({ currentMsgView: index })
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

  onMarkAllRead() {
    alert('todo')    
  }

  render() {
    const channel = this.props.params.channel
    const channelData = channel && findChannelData(app.channels, channel)
    const listItem = LISTITEMS[this.state.currentMsgView]
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

    const Toolbar = props => {    
      const isPinned = channelData && channelData.pinned
      return <div className="flex light-toolbar">
        <a onClick={()=>alert('todo')}><i className="fa fa-envelope-o" /> Compose Public Message</a>
        <div className="flex-fill"/>
        { channel
          ? <a onClick={this.onTogglePinned.bind(this)}><i className="fa fa-thumb-tack" /> {isPinned?"Unpin Channel":"Pin Channel"}</a>
          : '' }
        <a onClick={this.onMarkAllRead.bind(this)}><i className="fa fa-check-square" /> Mark All Read</a>
        <DropdownBtn items={LISTITEMS} right onSelect={this.onSelectMsgView.bind(this)}>{listItem.label}</DropdownBtn>
      </div>
    }

    // render content
    const thread = this.state.isUsingThreadPanel && this.state.currentThreadKey
    // composer composerProps={{isPublic: true, channel: channel, placeholder: 'Write a public post'+(channel?' on '+channel:'')}}    
    return <div id="newsfeed" key={channel||'*'}>
      <MsgList
        ref="list"
        threads
        dateDividers
        openMsgEvent
        filter={filter}
        Hero={Toolbar}
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
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