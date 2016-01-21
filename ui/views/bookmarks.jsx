'use babel'
import React from 'react'
import { Link } from 'react-router'
import { LocalStoragePersistedComponent } from '../com'
import LeftNav from '../com/leftnav'
import DropdownBtn from '../com/dropdown'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import Oneline from '../com/msg-view/oneline'
import Summary from '../com/msg-view/summary'
import app from '../lib/app'

const LISTITEMS = [
  { label: <span><i className="fa fa-list"/> View: Inline</span>, Component: Card },
  { label: <span><i className="fa fa-list"/> View: Large</span>, Component: Summary },
  { label: <span><i className="fa fa-list"/> View: Compact</span>, Component: Oneline }
]
const LISTITEM_CARD = LISTITEMS[0]
const LISTITEM_ONELINE = LISTITEMS[1]

export default class Bookmarks extends LocalStoragePersistedComponent {
  constructor(props) {
    super(props, 'msgList', {
      currentMsgView: 0
    })
  }

  cursor (msg) {
    if (msg)
      return [msg.ts, false]
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
        <Link to="/bookmarks"><i className="fa fa-bookmark" /> Bookmarked Threads</Link>
        <div className="flex-fill"/>
        <a href='javascript:;' onClick={this.onMarkAllRead.bind(this)}><i className="fa fa-check-square" /> Mark All Read</a>
        <DropdownBtn items={LISTITEMS} right onSelect={this.onSelectMsgView.bind(this)}>{listItem.label}</DropdownBtn>
      </div>
    }

    return <div id="bookmarks">
      <MsgList
        ref="list"
        threads
        dateDividers
        Hero={Toolbar}
        ListItem={ListItem} listItemProps={{ userPic: true }}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your bookmarks view is empty."
        source={app.ssb.patchwork.createBookmarkStream}
        cursor={this.cursor} />
    </div>
  }
}
