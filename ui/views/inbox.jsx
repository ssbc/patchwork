'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import { LocalStoragePersistedComponent } from '../com'
import LeftNav from '../com/leftnav'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import Summary from '../com/msg-view/summary'
import app from '../lib/app'

const LISTITEMS = [
  { label: <span><i className="fa fa-list"/> View: Large</span>, Component: Summary },
  { label: <span><i className="fa fa-list"/> View: Compact</span>, Component: Oneline }
]
const LISTITEM_CARD = LISTITEMS[0]
const LISTITEM_ONELINE = LISTITEMS[1]

export default class Inbox extends LocalStoragePersistedComponent {
  constructor(props) {
    super(props, 'inboxState', {
      currentMsgView: 0
    })
  }

  cursor (msg) {
    if (msg)
      return [msg.value.timestamp, msg.value.author]
  }

  onToggleMsgView() {
    this.setState({ currentMsgView: +(!this.state.currentMsgView) })
  }

  onMarkAllRead() {
    alert('todo')    
  }

  render() {
    const listItem = LISTITEMS[this.state.currentMsgView]
    const ListItem = listItem.Component
    const InboxLeftNav = props => {    
      return <LeftNav location={this.props.location} title="Private Posts">
        <div className="leftnav-link"><a onClick={this.onMarkAllRead.bind(this)}><i className="fa fa-check-square" /> Mark All Read</a></div>
        <div className="leftnav-link"><a onClick={this.onToggleMsgView.bind(this)}>{listItem.label}</a></div>
      </LeftNav>
    }
    // composer composerProps={{placeholder: 'Write a new private message'}}
    return <div id="inbox">
      <MsgList
        ref="list"
        threads
        dateDividers
        ListItem={ListItem} listItemProps={{ userPic: true }}
        LeftNav={InboxLeftNav}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your inbox is empty."
        source={app.ssb.patchwork.createInboxStream}
        cursor={this.cursor} />
    </div>
  }
}