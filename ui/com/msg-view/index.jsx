'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import { UserLink, NiceDate } from '../index'
import { Block as BlockContent, Inline as InlineContent } from '../msg-content'
import { isaReplyTo } from '../../lib/msg-relation'
import Composer from '../composer'
import app from '../../lib/app'
import u from '../../lib/util'

export class MsgView extends React.Component {
  constructor(props) {
    super(props)
    this.state = { collapsed: false }
  }
  componentDidMount() {
    this.setState({ collapsed: this.props.msg.isRead && !this.props.isLast })
  }
  onClick() {
    this.setState({ collapsed: false })
  }
  render() {
    let msg = this.props.msg
    if (this.state.collapsed) {
      return <div className="msg-view-collapsed" onClick={this.onClick.bind(this)}>
        <div className="msg-view-collapsed-col">{u.getName(msg.value.author)}</div>
        <div className="msg-view-collapsed-col"><InlineContent msg={msg} forceRaw={this.props.forceRaw} /></div>
        <div className="msg-view-collapsed-col">
          <NiceDate ts={msg.value.timestamp} />{' '}
          <a title="Star" onClick={()=>alert('todo')}><i className="fa fa-star-o"/></a>
        </div>
      </div>
    }
    return <div className="msg-view" style={{height: this.props.height}}>
      <div className="header">
        <div>
          <UserLink id={msg.value.author} />{' '}
          <span style={{color: '#aaa'}}>{msg.plaintext ? 'public' : 'private'}</span>
        </div>
        <div>
          <NiceDate ts={msg.value.timestamp} />{' '}
          <a title="Star" onClick={()=>alert('todo')}><i className="fa fa-star-o"/></a>
        </div>
      </div>
      <div className="body">
        {this.props.forceRaw ? <div>{msg.key}</div> : ''}
        <BlockContent msg={msg} forceRaw={this.props.forceRaw} />
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

  // helper to do setup on thread-change
  constructState(thread) {
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
    this.constructState(this.props.thread)
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
    this.constructState(newProps.thread)
  }
  componentWillUnmount() {
    // abort the livestream
    if (this.liveStream)
      this.liveStream(true, ()=>{})
  }

  render() {
    return <div className="msg-view-thread" style={{height: this.props.height}}>
      <div className="toolbar flex">
        <div className="flex-fill">
          <a className="btn" onClick={this.props.onDeselect} title="Close">Close</a>{' '}
          <a className="btn" onClick={this.props.onMarkSelectedUnread} title="Mark Unread"><i className="fa fa-eye-slash" /></a>{' '}
          <a className="btn" onClick={()=>alert('todo')} title="Bookmark"><i className="fa fa-bookmark-o" /></a>
        </div>
        <div>
          <a className="btn" onClick={()=>alert('todo')} title="View Raw Data"><i className="fa fa-code" /></a>
        </div>
      </div>
      {this.state.msgs.map((msg, i) => <MsgView key={msg.key} msg={msg} forceRaw={this.props.forceRaw} isLast={i === this.state.msgs.length-1} />)}
      <Composer key={this.props.thread.key} thread={this.props.thread} />
    </div>
  }
}