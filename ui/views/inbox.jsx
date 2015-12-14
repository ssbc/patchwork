'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import { LocalStoragePersistedComponent } from '../com'
import Dipswitch from '../com/form-elements/dipswitch'
import Tabs from '../com/tabs'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import Oneline from '../com/msg-view/oneline'
import * as HelpCards from '../com/help/cards'
import app from '../lib/app'

const LISTITEMS = [
  { label: <i className="fa fa-picture-o" />, Component: Card },
  { label: <i className="fa fa-th-list" />, Component: Oneline }
]
const LISTITEM_CARD = LISTITEMS[0]
const LISTITEM_ONELINE = LISTITEMS[1]

function unreadOnlyFilter (msg) {
  return msg.hasUnread
}

export default class Inbox extends LocalStoragePersistedComponent {
  constructor(props) {
    super(props, 'inboxState', {
      isToolbarOpen: true,
      listItemIndex: 1,
      isUnreadOnly: false
    })
  }
  cursor (msg) {
    if (msg)
      return [msg.value.timestamp, msg.value.author]
  }

  helpCards() {
    return <div className="cards-flow">
      <HelpCards.Inbox />
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

  onToggleUnreadOnly(b) {
    this.setState({ isUnreadOnly: b }, () => {
      this.refs.list.reload()
    })
  }

  render() {
    const listItem = LISTITEMS[this.state.listItemIndex]
    const ListItem = listItem.Component
    const queueNewMsgs = (listItem == LISTITEM_CARD) // only queue new messages for cards
    const Toolbar = (props) => {
      if (!this.state.isToolbarOpen) {
        return <div className="toolbar floating">
          <a className="btn" onClick={this.onToggleToolbar.bind(this)}><i className="fa fa-caret-square-o-down" /></a>
        </div>
      }
      return <div className="toolbar">
        <a className="btn" onClick={this.onToggleToolbar.bind(this)}><i className="fa fa-caret-square-o-up" /> Collapse</a>
        <span className="divider" />
        <Dipswitch label="Unread Only" checked={this.state.isUnreadOnly} onToggle={this.onToggleUnreadOnly.bind(this)} />
        <span className="divider" />
        <Tabs options={LISTITEMS} selected={listItem} onSelect={this.onSelectListItem.bind(this)} />
      </div>
    }
    const filter = msg => {
      if (this.state.isUnreadOnly)
        return unreadOnlyFilter(msg)
      return true
    }

    return <div id="inbox">
      <MsgList
        ref="list"
        threads
        dateDividers
        queueNewMsgs={queueNewMsgs}
        composer composerProps={{placeholder: 'Write a new post'}}
        filter={filter}
        Toolbar={Toolbar}
        ListItem={ListItem}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your inbox is empty."
        append={this.helpCards.bind(this)}
        source={app.ssb.patchwork.createInboxStream}
        cursor={this.cursor} />
    </div>
  }
}