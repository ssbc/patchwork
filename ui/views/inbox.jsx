'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
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

export default class Inbox extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      listItem: LISTITEM_ONELINE,
      unreadOnly: false
    }
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

  onSelectListItem(listItem) {
    this.setState({ listItem: listItem })
  }

  onToggleUnreadOnly(b) {
    this.setState({ unreadOnly: b }, () => {
      this.refs.list.reload()
    })
  }

  render() {
    const ListItem = this.state.listItem.Component
    const Toolbar = (props) => {
      return <div className="toolbar">
        <Dipswitch label="Unread Only" checked={this.state.unreadOnly} onToggle={this.onToggleUnreadOnly.bind(this)} />
        <span className="divider" />
        <Tabs options={LISTITEMS} selected={this.state.listItem} onSelect={this.onSelectListItem.bind(this)} />
      </div>
    }
    const filter = msg => {
      if (this.state.unreadOnly)
        return unreadOnlyFilter(msg)
      return true
    }

    return <div id="inbox">
      <MsgList
        ref="list"
        threads
        dateDividers
        composer composerProps={{placeholder: 'Write a new private message'}}
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