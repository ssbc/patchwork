'use babel'
import React from 'react'
import { Link } from 'react-router'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import app from '../lib/app'

export default class Follows extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  onMarkAllRead() {
    if (confirm('Mark all messages read. Are you sure?')) {
      app.ssb.patchwork.markAllRead('follows', err => {
        if (err)
          app.issue('Failed to mark all read', err)
      })
    }
  }

  render() {
    const ThisRightNav = props => {
      return <RightNav>
        <a className="btn" onClick={this.onMarkAllRead.bind(this)} href="javascript:"><i className="fa fa-envelope" /> Mark all read</a>
      </RightNav>
    }

    return <div id="follows">
      <MsgList
        ref="list"
        threads
        dateDividers
        composer composerProps={{ isPublic: true }}
        ListItem={Oneline} listItemProps={{ userPic: true }}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        RightNav={ThisRightNav}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Nobody has followed you yet."
        source={app.ssb.patchwork.createFollowStream}
        cursor={this.cursor} />
    </div>
  }
}
