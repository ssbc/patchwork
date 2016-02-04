'use babel'
import React from 'react'
import { Link } from 'react-router'
import LeftNav from '../com/leftnav'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import app from '../lib/app'

export default class Mentions extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }
  render() {
    return <div id="mentions">
      <MsgList
        ref="list"
        threads
        dateDividers
        composer composerProps={{ isPublic: true }}
        ListItem={Oneline} listItemProps={{ userPic: true }}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="You have not been @-mentioned in any posts yet."
        source={app.ssb.patchwork.createMentionStream}
        cursor={this.cursor} />
    </div>
  }
}
