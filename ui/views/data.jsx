'use babel'
import React from 'react'
import MsgList from '../com/msg-list'

export default class Data extends React.Component {
  render() {
    return <div className="data"><MsgList forceRaw /></div>
  }
}