'use babel'
import React from 'react'
import { Link } from 'react-router'
import { LocalStoragePersistedComponent } from '../com'
import LeftNav from '../com/leftnav'
import DropdownBtn from '../com/dropdown'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import Oneline from '../com/msg-view/oneline'
import app from '../lib/app'

const LISTITEMS = [
  { label: <span><i className="fa fa-list"/> View: Feed</span>, Component: Card },
  { label: <span><i className="fa fa-list"/> View: Inbox</span>, Component: Oneline }
]

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

  onToggleMsgView() {
    this.setState({ currentMsgView: +(!this.state.currentMsgView) })
  }

  onMarkAllRead() {
    alert('todo')
  }

  render() {
    const listItem = LISTITEMS[this.state.currentMsgView] || LISTITEMS[0]
    const ListItem = listItem.Component

    const Toolbar = props => {
      return <div className="flex light-toolbar">
        <Link to="/bookmarks"><i className="fa fa-bookmark" /> Bookmarked Threads</Link>
        <div className="flex-fill"/>
        <a href='javascript:;' onClick={this.onMarkAllRead.bind(this)}><i className="fa fa-check-square" /> Mark All Read</a>
        <a href='javascript:;' onClick={this.onToggleMsgView.bind(this)}>{listItem.label}</a>
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
