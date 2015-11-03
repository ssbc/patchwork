'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-list/oneline'
import * as HelpCards from '../com/help/cards'
import app from '../lib/app'

const FILTERS = [
  { label: 'All', fn: msg => true },
  { label: 'Unread', fn: msg => msg.hasUnread },
  { label: 'Private Messages', fn: msg => !msg.plaintext },
  { label: 'Mentions', fn: msg => msg.mentionsUser }
]

export default class Bookmarks extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  helpCards() {
    return <div className="cards-flow">
      <HelpCards.Bookmarks />
      <HelpCards.FindingUsers />
      <HelpCards.Pubs />
    </div>
  }

  render() {
    return <div id="bookmarks">
      <MsgList
        threads
        ListItem={Oneline}
        filters={FILTERS}
        emptyMsg="You have not bookmarked any messages."
        append={this.helpCards.bind(this)}
        source={app.ssb.patchwork.createBookmarkStream}
        cursor={this.cursor} />
    </div>
  }
}