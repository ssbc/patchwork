'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import app from '../lib/app'

export default class Inbox extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.value.timestamp, msg.value.author]
  }

  render() {
    return <div className="inbox"><MsgList source={app.ssb.patchwork.createInboxStream} cursor={this.cursor} /></div>
  }
}