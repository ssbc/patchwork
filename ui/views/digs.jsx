'use babel'
import React from 'react'
import { Link } from 'react-router'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from '../com/msg-list'
import Notification from '../com/msg-view/notification'
import app from '../lib/app'

export default class Mentions extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }
  render() {
    return <div id="digs">
      <MsgList
        ref="list"
        threads
        dateDividers
        composer composerProps={{ isPublic: true }}
        ListItem={Notification} listItemProps={{ userPic: true }}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        RightNav={RightNav}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Nobody has dug any of your posts yet. They will, though!"
        source={app.ssb.patchwork.createDigStream}
        cursor={this.cursor} />
    </div>
  }
}
