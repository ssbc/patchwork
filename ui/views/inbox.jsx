'use babel'
import React from 'react'
import LeftNav from '../com/leftnav'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import app from '../lib/app'

export default class Inbox extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  render() {
    return <div id="inbox">
      <MsgList
        ref="list"
        threads
        dateDividers
        composer composerProps={{ isPublic: false }}
        ListItem={Oneline} listItemProps={{ userPic: true }}
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your inbox is empty."
        source={app.ssb.patchwork.createInboxStream}
        cursor={this.cursor} />
    </div>
  }
}
