'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import { VerticalFilledContainer } from './index'
import Card from './msg-view/card'
import { isaReplyTo } from '../lib/msg-relation'
import Composer from './composer'
import app from '../lib/app'
import u from '../lib/util'

export default class Thread extends React.Component {
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
    var added = new Set()
    this.setState({
      thread: thread,
      isReplying: (this.state.thread && thread.key === this.state.thread.key) ? this.state.isReplying : false,
      msgs: [thread].concat((thread.related||[]).filter(msg => {
        if (added.has(msg.key)) return false // messages can be in the thread multiple times if there are >1 links
        added.add(msg.key)
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

  onSend(msg) {
    if (this.props.onNewReply)
      this.props.onNewReply(msg)
  }

  onBack() {
    window.history.back()
  }

  onSelectRoot() {
    let thread = this.props.thread
    let threadRoot = mlib.link(thread.value.content.root, 'msg')
    u.getPostThread(threadRoot.link, (err, thread) => this.props.onSelect(thread, true))
  }

  render() {
    let thread = this.props.thread
    let threadRoot = mlib.link(thread.value.content.root, 'msg')
    return <div className="msg-thread">
      <VerticalFilledContainer>
        <div className="items">
          <div className="container" style={{height: '40px'}}>
            <div className="toolbar flex">
              <a className="btn" onClick={this.onBack} title="Back"><i className="fa fa-caret-left" /> Back</a>
              <a className="btn" onClick={this.props.onMarkSelectedUnread} title="Mark Unread"><i className="fa fa-eye-slash" /> Mark Unread</a>
            </div>
            { threadRoot ? <div className="rootlink"><a onClick={this.onSelectRoot.bind(this)}>Replies to ↰</a></div> : '' }
          </div>
          { this.state.msgs.map((msg, i) => {
            let forceOpen = (i === 0)
            return <Card
              key={msg.key}
              msg={msg}
              noReplies
              forceRaw={this.props.forceRaw}
              forceOpen={forceOpen}
              onToggleStar={()=>this.props.onToggleStar(msg)}
              onFlag={(msg, reason)=>this.props.onFlag(msg, reason)}
              onToggleBookmark={()=>this.props.onToggleBookmark(msg)} />
          }) }
          <div className="container"><Composer key={thread.key} thread={thread} onSend={this.onSend.bind(this)} /></div>
        </div>
      </VerticalFilledContainer>
    </div>
  }
}