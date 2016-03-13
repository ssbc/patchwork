'use babel'
import React from 'react'
import { Link } from 'react-router'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from '../com/msg-list'
import SimpleMsgList from '../com/msg-list/simple'
import Oneline from '../com/msg-view/oneline'
import Card from '../com/msg-view/card'
import Dropdown from '../com/dropdown'
import app from '../lib/app'

export default class Home extends React.Component {
  onMarkAllRead() {
    app.ssb.patchwork.markAllRead('inbox', err => {
      if (err)
        app.issue('Failed to mark all read', err)
    })
  }

  render() {
    const cursor = msg => {
      if (msg)
        return [msg.ts, false]
    }
    const inboxSource = opts => {
      opts.unread = true
      return app.ssb.patchwork.createInboxStream(opts)
    }

    // component for hero (inbox)
    const Hero = props => {
      const emptyMsg = false//<div>You have no unread messages. <Link to="/inbox?archived=1">View Archived</Link></div>
      return <SimpleMsgList threads ListItem={Oneline} source={inboxSource} cursor={cursor} live={{ gt: [Date.now(), null] }} emptyMsg={false} />
    }

    // component for rightnav
    const ThisRightNav = props => {
      const markAllReadItems = [{ label: 'Are you sure? Click here to confirm.', onSelect: this.onMarkAllRead.bind(this) }]
      return <RightNav>
        <hr className="labeled" data-label="inbox" />
        <Dropdown className="btn hint--top-left" data-hint="Mark all messages on this page as 'read'." items={markAllReadItems} right>
          <i className="fa fa-envelope" /> Mark all read
        </Dropdown>
      </RightNav>
    }

    // render
    return <div id="home">
      <MsgList
        ref="list"
        threads
        dateDividers
        batchLoadAmt={5}
        composer composerProps={{ isPublic: true }}
        Hero={Hero}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        RightNav={ThisRightNav}
        ListItem={Card} listItemProps={{ listView: true }}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="Your feed is empty"
        source={app.ssb.patchwork.createPublicPostStream}
        cursor={cursor} />
    </div>
  }
}
