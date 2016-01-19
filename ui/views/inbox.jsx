'use babel'
import React from 'react'
import { Link } from 'react-router'
import threadlib from 'patchwork-threads'
import { LocalStoragePersistedComponent } from '../com'
import LeftNav from '../com/leftnav'
import DropdownBtn from '../com/dropdown'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import Oneline from '../com/msg-view/oneline'
import Summary from '../com/msg-view/summary'
import app from '../lib/app'
import social from '../lib/social-graph'

const LISTITEMS = [
  { label: <span><i className="fa fa-list"/> View: Inline</span>, Component: Card },
  { label: <span><i className="fa fa-list"/> View: Large</span>, Component: Summary },
  { label: <span><i className="fa fa-list"/> View: Compact</span>, Component: Oneline }
]
const LISTITEM_CARD = LISTITEMS[0]
const LISTITEM_ONELINE = LISTITEMS[1]

export default class Inbox extends LocalStoragePersistedComponent {
  constructor(props) {
    super(props, 'msgList', {
      currentMsgView: 0
    })
  }

  cursor (msg) {
    if (msg) {
      // find the last post (inbox is ordered by timestamp of last post in thread)
      var last = threadlib.getLastThreadPost(msg)
      return [msg.value.timestamp, msg.value.author]
    }
  }

  onSelectMsgView(v, index) {
    this.setState({ currentMsgView: index })
  }

  onMarkAllRead() {
    alert('todo')
  }

  render() {
    const listItem = LISTITEMS[this.state.currentMsgView]
    const ListItem = listItem.Component

    const Toolbar = props => {
      return <div className="flex light-toolbar">
        <Link to="/inbox"><i className="fa fa-inbox" /> Private Threads</Link>
        <div className="flex-fill"/>
        <a href='javascript:;' onClick={this.onMarkAllRead.bind(this)}><i className="fa fa-check-square" /> Mark All Read</a>
        <DropdownBtn items={LISTITEMS} right onSelect={this.onSelectMsgView.bind(this)}>{listItem.label}</DropdownBtn>
      </div>
    }

    // composer composerProps={{placeholder: 'Write a new private message'}}
    return <div id="inbox">
      <MsgList
        ref="list"
        threads
        dateDividers
        composer composerProps={{ isPublic: false }}
        Hero={Toolbar}
        ListItem={ListItem} listItemProps={{ userPic: true }}
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your inbox is empty."
        source={app.ssb.patchwork.createInboxStream}
        filter={followedOnlyFilter}
        cursor={this.cursor} />
    </div>
  }
}

function followedOnlyFilter (msg) {
  return msg.value.author === app.user.id || social.follows(app.user.id, msg.value.author)
}
