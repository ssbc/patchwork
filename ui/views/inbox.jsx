'use babel'
import React from 'react'
import MsgList from '../com/msg-list'

export default class Inbox extends React.Component {
  render() {
    return <div className="inbox"><MsgList as="summary" /></div>
  }
}