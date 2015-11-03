'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
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

export default class Inbox extends React.Component {
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

  render() {
    return <div id="inbox">
      <MsgList
        threads
        ListItem={Oneline}
        filters={FILTERS}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your inbox is empty."
        append={this.helpCards.bind(this)}
        source={app.ssb.patchwork.createInboxStream}
        cursor={this.cursor} />
    </div>
  }
}