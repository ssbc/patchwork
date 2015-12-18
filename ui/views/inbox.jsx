'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import MsgList from '../com/msg-list'
import Summary from '../com/msg-view/summary'
import * as HelpCards from '../com/help/cards'
import app from '../lib/app'

export default class Inbox extends React.Component {
  constructor(props) {
    super(props, 'inboxState', {
      isToolbarOpen: true,
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

  render() {
    const Hero = props => {
      return <div className="hero">
        <h1>Inbox</h1>
        <div>Private, encrypted messages.</div>
      </div>
    }

    return <div id="inbox">
      <MsgList
        ref="list"
        threads
        dateDividers
        composer composerProps={{placeholder: 'Write a new private message'}}
        ListItem={Summary}
        Hero={Hero}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your inbox is empty."
        append={this.helpCards.bind(this)}
        source={app.ssb.patchwork.createInboxStream}
        cursor={this.cursor} />
    </div>
  }
}