'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import app from '../lib/app'

export default class Data extends React.Component {
  render() {
    const source = opts => {
      return app.ssb.createLogStream(opts)
    }
    return <div id="data"><MsgList ListItem={Oneline} listItemProps={{noReplies: true}} source={source} live={{ gt: Date.now() }} /></div>
  }
}