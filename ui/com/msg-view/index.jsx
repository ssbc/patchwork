'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import { UserLink, NiceDate } from '../index'
import { Block as Content } from '../msg-content'
import { isaReplyTo } from '../../lib/msg-relation'
import Composer from '../composer'
import app from '../../lib/app'
import u from '../../lib/util'

export class MsgView extends React.Component {
  render() {
    return <div className="msg-view" style={{height: this.props.height}}>
      <div className="header">
        <div><UserLink id={this.props.msg.value.author} /></div>
        <div><NiceDate ts={this.props.msg.value.timestamp} /></div>
      </div>
      <div className="body">
        {this.props.forceRaw ? <div>{this.props.msg.key}</div> : ''}
        <Content msg={this.props.msg} forceRaw={this.props.forceRaw} />
      </div>
    </div>
  }
}

export class Thread extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      thread: null,
      msgs: []
    }
    this.liveStream = null
  }
  flattenThread(thread) {
    // collapse thread into a flat message-list
    var added = {}
    this.setState({
      thread: thread,
      msgs: [thread].concat((thread.related||[]).filter(msg => {
        if (added[msg.key]) return false // messages can be in the thread multiple times if there are >1 links
        added[msg.key] = true
        return (msg.value.content.type == 'post') && isaReplyTo(msg, thread)
      }))
    })
  }
  componentDidMount() {
    this.flattenThread(this.props.thread)
    // listen for new replies
    if (this.props.live) {
      pull(
        // listen for all new messages
        (this.liveStream = app.ssb.createLogStream({ live: true, gt: Date.now() })),
        // decrypt (as needed)
        pull.asyncMap((msg, cb) => { u.decryptThread(msg, () => { cb(null, msg) }) }),
        // read...
        pull.drain((msg) => {
          var c = msg.value.content
          var root = mlib.lib(c.root, 'msg')
          // reply post to this thread?
          if (c.type == 'post' && root && root.link === this.props.thread.key) {
            // add to thread and flatlist
            this.state.msgs.push(msg)
            this.state.thread.related = (this.state.thread.related||[]).concat(msg)
            this.setState({ thread: this.state.thread, msgs: this.state.msgs })
          }
        })
      )
    }
  }
  componentWillReceiveProps(newProps) {
    this.flattenThread(newProps.thread)
  }
  componentWillUnmount() {
    // abort the livestream
    if (this.liveStream)
      this.liveStream(true, ()=>{})
  }
  render() {
    return <div style={{height: this.props.height}}>
      {this.state.msgs.map((msg) => <MsgView key={msg.key} msg={msg} forceRaw={this.props.forceRaw} />)}
      <Composer key={this.props.thread.key} thread={this.props.thread} />
    </div>
  }
}