'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import schemas from 'ssb-msg-schemas'
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
  constructState(id) {
    // load thread
    u.getPostThread(id, (err, thread) => {
      if (err)
        return app.issue('Failed to Load Message', err, 'This happened in msg-list componentDidMount')
      this.setState({ thread: thread })

      // mark read
      if (thread.hasUnread) {
        u.markThreadRead(thread, (err) => {
          if (err)
            return app.minorIssue('Failed to mark thread as read', err)
          this.setState({ thread: thread })
        })
      }

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

      // listen for new replies
      if (this.props.live) {
        if (this.liveStream)
          this.liveStream(true, ()=>{}) // abort existing livestream

        pull(
          // listen for all new messages
          (this.liveStream = app.ssb.createLogStream({ live: true, gt: Date.now() })),
          pull.filter(obj => !obj.sync), // filter out the sync obj
          pull.asyncMap(u.decryptThread),
          pull.drain((msg) => {
            var c = msg.value.content
            var root = mlib.link(c.root, 'msg')
            // reply post to this thread?
            if (c.type == 'post' && root && root.link === this.state.thread.key) {
              // add to thread and flatlist
              this.state.msgs.push(msg)
              this.state.thread.related = (this.state.thread.related||[]).concat(msg)
              this.setState({ thread: this.state.thread, msgs: this.state.msgs })
            }
          })
        )
      }
    })
  }
  componentDidMount() {
    this.constructState(this.props.id)
  }
  componentWillReceiveProps(newProps) {
    this.constructState(newProps.id)
  }
  componentWillUnmount() {
    // abort the livestream
    if (this.liveStream)
      this.liveStream(true, ()=>{})
  }

  onMarkUnread() {
    // mark unread in db
    let thread = this.state.thread
    app.ssb.patchwork.markUnread(thread.key, (err) => {
      if (err)
        return app.minorIssue('Failed to mark unread', err, 'Happened in onMarkUnread of MsgThread')

      // re-render
      thread.isRead = false
      thread.hasUnread = true
      this.setState(this.state)
    })
  }

  onToggleBookmark(msg) {
    // toggle in the DB
    app.ssb.patchwork.toggleBookmark(msg.key, (err, isBookmarked) => {
      if (err)
        return app.issue('Failed to toggle bookmark', err, 'Happened in onToggleBookmark of MsgThread')

      // re-render
      msg.isBookmarked = isBookmarked
      this.setState(this.state)
    })
  }

  onToggleStar(msg) {
    // get current state
    msg.votes = msg.votes || {}
    let oldVote = msg.votes[app.user.id]
    let newVote = (oldVote === 1) ? 0 : 1

    // publish new message
    var voteMsg = schemas.vote(msg.key, newVote)
    let done = (err) => {
      if (err)
        return app.issue('Failed to publish vote', err, 'Happened in onToggleStar of MsgThread')

      // re-render
      msg.votes[app.user.id] = newVote
      this.setState(this.state)
    }
    if (msg.plaintext)
      app.ssb.publish(voteMsg, done)
    else {
      let recps = mlib.links(msg.value.content.recps).map(l => l.link)
      app.ssb.private.publish(voteMsg, recps, done)
    }
  }

  onFlag(msg, reason) {
    if (!reason)
      throw new Error('reason is required')

    // publish new message
    const voteMsg = (reason === 'unflag') // special case
      ? schemas.vote(msg.key, 0)
      : schemas.vote(msg.key, -1, reason)
    let done = (err) => {
      if (err)
        return app.issue('Failed to publish flag', err, 'Happened in onFlag of MsgThread')

      // re-render
      msg.votes = msg.votes || {}
      msg.votes[app.user.id] = (reason === 'unflag') ? 0 : -1
      this.setState(this.state)
    }
    if (msg.plaintext)
      app.ssb.publish(voteMsg, done)
    else {
      let recps = mlib.links(msg.value.content.recps).map(l => l.link)
      app.ssb.private.publish(voteMsg, recps, done)
    }
  }

  onSend(msg) {
    if (this.props.onNewReply)
      this.props.onNewReply(msg)
  }

  onBack() {
    window.history.back()
  }

  onSelectRoot() {
    let thread = this.state.thread
    let threadRoot = mlib.link(thread.value.content.root, 'msg')
    window.location.hash = '#/msg/'+encodeURIComponent(threadRoot.link)
  }

  render() {
    let thread = this.state.thread
    if (!thread)
      return <span/>
    let threadRoot = mlib.link(thread.value.content.root, 'msg')
    return <div className="msg-thread">
      <VerticalFilledContainer>
        <div className="items">
          <div className="container" style={{height: '40px'}}>
            <div className="toolbar flex">
              <a className="btn" onClick={this.onBack} title="Back"><i className="fa fa-caret-left" /> Back</a>
              <a className="btn" onClick={this.onMarkUnread.bind(this)} title="Mark Unread"><i className="fa fa-eye-slash" /> Mark Unread</a>
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
              onToggleStar={()=>this.onToggleStar(msg)}
              onFlag={(msg, reason)=>this.onFlag(msg, reason)}
              onToggleBookmark={()=>this.onToggleBookmark(msg)} />
          }) }
          <div className="container"><Composer key={thread.key} thread={thread} onSend={this.onSend.bind(this)} /></div>
        </div>
      </VerticalFilledContainer>
    </div>
  }
}