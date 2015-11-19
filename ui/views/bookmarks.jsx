'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import * as HelpCards from '../com/help/cards'
import app from '../lib/app'

const FILTERS = [
  { label: 'All Messages', fn: msg => true },
  { label: 'Unread', fn: msg => msg.hasUnread },
  { label: 'Private', fn: msg => !msg.plaintext }
]

export default class Bookmarks extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  helpCards() {
    return <div className="cards-flow">
      <HelpCards.Bookmarks />
      <HelpCards.Pubs />
      <HelpCards.FindingUsers />
    </div>
  }

  render() {
    return <div id="bookmarks">
      <MsgList
        threads
        floatingToolbar
        live={{ gt: [Date.now(), null] }}
        ListItem={Oneline}
        filters={FILTERS}
        emptyMsg="You have not bookmarked any messages."
        append={this.helpCards.bind(this)}
        source={app.ssb.patchwork.createBookmarkStream}
        cursor={this.cursor} />
    </div>
  }
}