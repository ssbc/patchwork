'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import { UserLink, NiceDate } from '../index'
import { Block as Content } from '../msg-content'
import { isaReplyTo } from '../../lib/msg-relation'

export class MsgView extends React.Component {
  render() {
    return <div className="msg-view" style={{height: this.props.height}}>
      <div className="header">
        <div><UserLink id={this.props.msg.value.author} /></div>
        <div><NiceDate ts={this.props.msg.value.timestamp} /></div>
      </div>
      <div className="body">
        <Content msg={this.props.msg} forceRaw={this.props.forceRaw} />
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
    return <div style={{height: this.props.height}}>{msgs.map((msg) => <MsgView key={msg.key} msg={msg} forceRaw={this.props.forceRaw} />)}</div>
  }
}