'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Card from '../com/msg-list/card'

const FILTERS = [
  { label: 'All', fn: msg => true },
  { label: 'Digs', fn: msg => true }, // TODO
  { label: 'Follows', fn: msg => true }, // TODO
  { label: 'Mentions', fn: msg => msg.mentionsUser }
]

export default class Notifications extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  render() {
    return <div id="notifications">
      <MsgList
        ListItem={Card}
        emptyMsg="No new notifications."
        filters={FILTERS}
        source={app.ssb.patchwork.createNotificationsStream}
        cursor={this.cursor} 
        live={{ gt: [Date.now(), false] }} />
    </div>
  }
}