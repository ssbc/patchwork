'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Card from '../com/msg-list/card'

export default class Notifications extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  render() {
    return <div id="notifications">
      <MsgList
        ListItem={Card}
        emptyMsg="You have not bookmarked any messages"
        source={app.ssb.patchwork.createNotificationsStream}
        cursor={this.cursor} 
        live={{ gt: [Date.now(), false] }} />
    </div>
  }
}