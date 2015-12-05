'use babel'
import React from 'react'
import MsgList from '../msg-list'
import Notification from '../msg-view/notification'
import app from '../../lib/app'

const FILTERS = [
  { label: 'All', fn: msg => true },
  { label: <i className="fa fa-hand-peace-o"/>, fn: msg => msg.value.content.type === 'vote' },
  { label: <i className="fa fa-user-plus"/>, fn: msg => msg.value.content.type === 'contact' },
  { label: <i className="fa fa-at"/>, fn: msg => msg.value.content.type === 'post' }
]

export default class Notifications extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }
  render() {
    return <div className="notifications">
      <MsgList
        ListItem={Notification}
        emptyMsg="No new notifications."
        filters={FILTERS}
        source={app.ssb.patchwork.createNotificationsStream}
        cursor={this.cursor} 
        live={{ gt: [Date.now(), false] }} />
    </div>
  }
}