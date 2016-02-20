'use babel'
import React from 'react'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import app from '../lib/app'

export default class InboxPosts extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  onMarkAllRead() {
    if (confirm('Mark all messages read. Are you sure?')) {
      app.ssb.patchwork.markAllRead('inbox', err => {
        if (err)
          app.issue('Failed to mark all read', err)
      })
    }
  }

  render() {
    const ThisRightNav = props => {
      return <RightNav>
        <hr className="labeled" data-label="important" />
        <a className="btn" onClick={this.onMarkAllRead.bind(this)} href="javascript:"><i className="fa fa-envelope" /> Mark all read</a>
      </RightNav>
    }

    return <div id="inbox">
      <MsgList
        ref="list"
        threads
        dateDividers
        composer composerProps={{ isPublic: true }}
        ListItem={Oneline} listItemProps={{ userPic: true }}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        RightNav={ThisRightNav}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your inbox is empty."
        source={app.ssb.patchwork.createInboxStream}
        cursor={this.cursor} />
    </div>
  }
}
