'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Card from '../com/msg-list/card'

export default class Data extends React.Component {
  render() {
    return <div className="data"><MsgList forceRaw ListItem={Card} live={{ gt: Date.now() }} /></div>
  }
}