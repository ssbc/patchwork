'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import app from '../lib/app'

export default class Data extends React.Component {
  render() {
    const source = opts => {
      return app.ssb.createLogStream(opts)
    }
    return <div id="data"><MsgList forceRaw ListItem={Card} source={source} live={{ gt: Date.now() }} /></div>
  }
}