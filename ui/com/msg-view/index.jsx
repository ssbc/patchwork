'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import { UserLink, NiceDate } from '../index'
import { Block as Content } from '../msg-content'

export default class MsgView extends React.Component {
  render() {
    return <div className="msg-view">
      <div className="header">
        <div><UserLink id={this.props.msg.value.author} /></div>
        <div><NiceDate ts={this.props.msg.value.timestamp} /></div>
      </div>
      <div className="body">
        <Content msg={this.props.msg} />
      </div>
    </div>
  }
}

export class Thread extends React.Component {
  constructor(props) {
    super(props)
  }
  render() {
    // collapse into a flat message-list
    var added = {}
    var msgs = [this.props.thread].concat((this.props.thread.related||[]).filter(msg => {
      if (added[msg.key]) return false // messages can be in the thread multiple times if there are >1 links
      added[msg.key] = true
      return (msg.value.content.type == 'post') && isaReplyTo(msg, this.props.thread)
    }))
    return <div>{msgs.map((msg) => <MsgView msg={msg} />)}</div>
  }
}

function isaReplyTo (a, b) {
  var c = a.value.content
  return (c.root && mlib.link(c.root).link == b.key || c.branch && mlib.link(c.branch).link == b.key)
}