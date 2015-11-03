'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Card from '../com/msg-list/card'

export default class Data extends React.Component {
  render() {
    return <div id="data"><MsgList forceRaw ListItem={Card} live={{ gt: Date.now() }} /></div>
  }
}