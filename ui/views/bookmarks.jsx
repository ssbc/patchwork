'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import app from '../lib/app'

export default class Bookmarks extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  render() {
    return <div id="bookmarks">
      <MsgList threads emptyMsg="You have not bookmarked any messages" source={app.ssb.patchwork.createBookmarkStream} cursor={this.cursor} />
    </div>
  }
}