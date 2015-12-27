'use babel'
import React from 'react'
import pull from 'pull-stream'
import mlib from 'ssb-msgs'
import LeftNav from '../com/leftnav'
import MsgList from '../com/msg-list'
import Summary from '../com/msg-view/summary'
import app from '../lib/app'

export default class Inbox extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.value.timestamp, msg.value.author]
  }

  render() {
    return <div id="bookmarks">
      <MsgList
        ref="list"
        threads
        dateDividers
        ListItem={Summary} listItemProps={{ userPic: true }}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your bookmarks view is empty."
        source={app.ssb.patchwork.createBookmarkStream}
        cursor={this.cursor} />
    </div>
  }
}