'use babel'
import React from 'react'
import LeftNav from '../com/leftnav'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import app from '../lib/app'

// newsfeed view
export default class NewsFeed extends React.Component {
  constructor(props) {
    super(props)
    this.state = { channels: app.channels || [] }

    this.refresh = () => {
      this.setState({ channels: app.channels })
    }
    app.on('update:channels', this.refresh)
    app.on('ui:set-view-mode', (this.setMsgView = view => this.setState({ currentMsgView: view }) ))
  }
  componentWillUnmount() {
    app.removeListener('update:channels', this.refresh)
    app.removeListener('ui:set-view-mode', this.setMsgView)
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
      return app.ssb.patchwork.createNewsfeedStream(opts)
    }

    // render content
    return <div id="newsfeed" key={channel||'*'}>
      <MsgList
        ref="list"
        threads
        dateDividers
        openMsgEvent
        composer composerProps={{ isPublic: true, channel: channel }}
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        ListItem={Oneline} listItemProps={{ userPic: true }}
        live={{ gt: [Date.now(), null] }}
        emptyMsg={(channel) ? ('No posts on "'+channel+'"... yet!') : 'Your newsfeed is empty.'}
        source={source}
        cursor={cursor} />
    </div>
  }
}