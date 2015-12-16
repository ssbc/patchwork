'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import { LocalStoragePersistedComponent } from '../com'
import Dipswitch from '../com/form-elements/dipswitch'
import Tabs from '../com/tabs'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import Summary from '../com/msg-view/summary'
import Thread from '../com/msg-thread'
import * as HelpCards from '../com/help/cards'
import app from '../lib/app'
import social from '../lib/social-graph'

const LISTITEMS = [
  { label: <i className="fa fa-picture-o" />, Component: Card },
  { label: <i className="fa fa-th-list" />, Component: Summary }
]
const LISTITEM_CARD = LISTITEMS[0]
const LISTITEM_ONELINE = LISTITEMS[1]

function followedOnlyFilter (msg) {
  return msg.value.author === app.user.id || social.follows(app.user.id, msg.value.author)
}

export default class NewsFeed extends LocalStoragePersistedComponent {
  constructor(props) {
    super(props, 'newsfeedState', {
      isToolbarOpen: true,
      listItemIndex: 0,
      isFollowedOnly: false,
      isUsingThreadPanel: false,
      currentThreadKey: null
    })

    this.onOpenMsg = key => {
      if (this.state.isUsingThreadPanel) {
        // show in the panel
        this.setState({ currentThreadKey: key })
      } else {
        // navigate
        app.history.pushState(null, '/msg/' + encodeURIComponent(key))
      }      
    }
    app.on('open:msg', this.onOpenMsg)
  }
  componentWillUnmount() {
    app.removeListener('open:msg', this.onOpenMsg)
  }

  cursor (msg) {
    if (msg)
      return [msg.value.timestamp, msg.value.author]
  }

  helpCards() {
    return <div className="cards-flow">
      <HelpCards.NewsFeed />
      <HelpCards.Pubs />
      <HelpCards.FindingUsers />
    </div>
  }

  onToggleToolbar() {
    this.setState({ isToolbarOpen: !this.state.isToolbarOpen }, () => {
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

  render() {
    const listItem = LISTITEMS[this.state.listItemIndex]
    const ListItem = listItem.Component
    const Hero = (props) => {
      if (!this.state.isToolbarOpen) {
        return <div className="toolbar floating">
          <a className="btn" onClick={this.onToggleToolbar.bind(this)}><i className="fa fa-wrench" /></a>
        </div>
      }
      return <div className="toolbar">
        <a className="btn" onClick={this.onToggleToolbar.bind(this)}><i className="fa fa-check" /> Done</a>
        <span className="divider" />
        <Dipswitch label={this.state.isFollowedOnly?"Followed Only":"All Users"} checked={this.state.isFollowedOnly} onToggle={this.onToggleFollowedOnly.bind(this)} />
        <span className="divider" />
        <Dipswitch label={this.state.isUsingThreadPanel?"Preview Threads":"Navigate to Threads"} checked={this.state.isUsingThreadPanel} onToggle={this.onToggleThreadPanel.bind(this)} />
        <span className="divider" />
        <Tabs options={LISTITEMS} selected={listItem} onSelect={this.onSelectListItem.bind(this)} />
      </div>
    }
    const filter = msg => {
      if (this.state.isFollowedOnly)
        return followedOnlyFilter(msg)
      return true
    }

    const thread = this.state.currentThreadKey
    return <div id="newsfeed">
      <MsgList
        ref="list"
        threads
        composer composerProps={{isPublic: true, placeholder: 'Write a new public post'}}
        queueNewMsgs
        dateDividers
        openMsgEvent
        filter={filter}
        Hero={Hero}
        ListItem={ListItem}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your newsfeed is empty."
        append={this.helpCards.bind(this)}
        source={app.ssb.patchwork.createNewsfeedStream}
        cursor={this.cursor} />
      { this.state.isUsingThreadPanel && this.state.currentThreadKey ? <Thread key={thread} id={thread} closeBtn live /> : '' }
    </div>
  }
}