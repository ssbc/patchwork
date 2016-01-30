'use babel'
import React from 'react'
import LeftNav from '../com/leftnav'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import app from '../lib/app'

export default class PublicPosts extends React.Component {
  constructor(props) {
    super(props)
    this.state = { channels: app.channels || [] }

    this.refresh = () => {
      this.setState({ channels: app.channels })
    }
    app.on('update:channels', this.refresh)
  }
  componentWillUnmount() {
    app.removeListener('update:channels', this.refresh)
  }

  render() {
    const channel = this.props.params.channel

    // msg-list params
    const cursor = msg => {
      if (msg)
        return [msg.ts, false]
    }
    const source = (opts) => {
      if (channel)
        return app.ssb.patchwork.createChannelStream(channel, opts)
      return app.ssb.patchwork.createPublicPostStream(opts)
    }

    // render content
    return <div id="public-posts" key={channel||'*'}>
      <MsgList
        ref="list"
        threads
        dateDividers
        openMsgEvent
        composer composerProps={{ isPublic: true, channel: channel }}
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        ListItem={Oneline} listItemProps={{ userPic: true }}
        live={{ gt: [Date.now(), null] }}
        emptyMsg={(channel) ? ('No posts on "'+channel+'"... yet!') : 'Your feed is empty.'}
        source={source}
        cursor={cursor} />
    </div>
  }
}