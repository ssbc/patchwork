'use babel'
import React from 'react'
import MsgList from '../com/msg-list'

export default class Forum extends React.Component {
  filter(msg) {
    // toplevel, public posts only
    var c = msg.value.content
    if (typeof c == 'string')
      return false
    if (c.type !== 'post')
      return false
    if (c.root || c.branch)
      return false
    return true
  }

  render() {
    return <div className="forum"><MsgList filter={this.filter} /></div>
  }
}