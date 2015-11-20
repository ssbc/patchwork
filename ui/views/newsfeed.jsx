'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import * as HelpCards from '../com/help/cards'
import WelcomeHelp from '../com/help/welcome'
import app from '../lib/app'
import social from '../lib/social-graph'

const FILTERS = [
  { label: 'Friends + Network', fn: msg => true },
  { label: 'Friends', fn: msg => msg.value.author === app.user.id || social.follows(app.user.id, msg.value.author) }
]

export default class NewsFeed extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.value.timestamp, msg.value.author]
  }

  helpCards() {
    return <div className="cards-flow">
      <HelpCards.NewsFeed />
      <HelpCards.Pubs />
      <HelpCards.FindingUsers />
    </div>
  }

  render() {
    const mid = this.props.params.id || false
    return <div id="newsfeed">
      <MsgList
        threads
        floatingToolbar
        queueNewMsgs
        ListItem={Card}
        filters={FILTERS}
        selected={mid}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your newsfeed is empty."
        append={this.helpCards.bind(this)}
        source={app.ssb.patchwork.createNewsfeedStream}
        cursor={this.cursor} />
    </div>
  }
}