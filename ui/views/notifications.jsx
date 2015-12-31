'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import LeftNav from '../com/leftnav'
import MsgList from '../com/msg-list'
import Notification from '../com/msg-view/notification'
import app from '../lib/app'

export default class Bookmarks extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  render() {
    return <div id="bookmarks">
      <MsgList
        ref="list"
        threads
        dateDividers
        ListItem={Notification} listItemProps={{ userPic: true }}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="You have no notifications."
        source={app.ssb.patchwork.createNotificationsStream}
        cursor={this.cursor} />
    </div>
  }
}