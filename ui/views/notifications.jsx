'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Notification from '../com/msg-view/notification'
import * as HelpCards from '../com/help/cards'

const FILTERS = [
  { label: 'All', fn: msg => true },
  { label: <span><i className="fa fa-hand-peace-o"/> Likes</span>, fn: msg => msg.value.content.type === 'vote' },
  { label: <span><i className="fa fa-user-plus"/> Follows</span>, fn: msg => msg.value.content.type === 'contact' },
  { label: <span><i className="fa fa-at"/> Mentions</span>, fn: msg => msg.value.content.type === 'post' }
]

export default class Notifications extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  helpCards() {
    return <div className="cards-flow">
      <HelpCards.Notifications />
      <HelpCards.Pubs />
      <HelpCards.FindingUsers />
    </div>
  }

  render() {
    return <div id="notifications">
      <MsgList
        ListItem={Notification}
        emptyMsg="No new notifications."
        append={this.helpCards.bind(this)}
        filters={FILTERS}
        source={app.ssb.patchwork.createNotificationsStream}
        cursor={this.cursor} 
        live={{ gt: [Date.now(), false] }} />
    </div>
  }
}