'use babel'
import React from 'react'
import MsgList from '../msg-list'
import Summary from '../msg-view/Summary'
import app from '../../lib/app'

const FILTERS = [
  { label: 'All', fn: msg => true },
  { label: 'Unread', fn: msg => msg.hasUnread },
  { label: 'Private', fn: msg => !msg.plaintext }
]

export default class Bookmarks extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }
  render() {
    return <div className="bookmarks">
      <MsgList
        ListItem={Summary}
        emptyMsg="No messages."
        filters={FILTERS}
        source={app.ssb.patchwork.createBookmarkStream}
        cursor={this.cursor} 
        live={{ gt: [Date.now(), false] }} />
    </div>
  }
}