'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import app from '../lib/app'

export default class Starred extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.value.timestamp, msg.value.author]
  }

  render() {
    return <div className="starred">
      <MsgList threads emptyMsg="You have not starred any messages" source={app.ssb.patchwork.createMyvoteStream} filter={this.filter} />
    </div>
  }
}