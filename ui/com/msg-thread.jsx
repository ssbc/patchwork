'use babel'
import React from 'react'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group'
import mlib from 'ssb-msgs'
import schemas from 'ssb-msg-schemas'
import threadlib from 'patchwork-threads'
import { VerticalFilledContainer } from './index'
import ResponsiveElement from './responsive-element'
import Card from './msg-view/card'
import { isaReplyTo, relationsTo } from '../lib/msg-relation'
import Composer from './composer'
import app from '../lib/app'
import u from '../lib/util'

class BookmarkBtn extends React.Component {
  render() {
    const b = this.props.isBookmarked
    const title = 'Bookmark'+(b?'ed':'')
    return <a className={'btn '+(b?' selected':'')} onClick={this.props.onClick} title={title}>
        <i className={'fa fa-bookmark'+(b?'':'-o')} /> {title} Thread
    </a>
  }
}

class UnreadBtn extends React.Component {
  render() {
    const b = this.props.isUnread
    const title = (b?'Mark Read':'Mark Unread')
    const icon = 'fa fa-'+(b?'square-o':'check-square-o')
    return <a className="btn" onClick={this.props.onClick} title={title}>
      <i className={icon} /> Read
    </a>
  }
}
            

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
    threadlib.getPostThread(app.ssb, id, (err, thread) => {
      if (err)
        return app.issue('Failed to Load Message', err, 'This happened in msg-list componentDidMount')

      var that = this // yes we're going there
      
      threadlib.getLatestRevision(app.ssb, thread, function(thread) {
        var flatThread = threadlib.flattenThread(thread)
        // set state, after some processing
        that.setState({
          thread: thread,
          msgs: flatThread,
          isReplying: (that.state.thread && thread.key === that.state.thread.key) ? that.state.isReplying : false
        })

        // mark read
        if (thread.hasUnread) {
          threadlib.markThreadRead(app.ssb, thread, (err) => {
            if (err)
              return app.minorIssue('Failed to mark thread as read', err)
            that.setState({ thread: thread })
          })
        }

        // listen for new replies
        if (that.props.live) {
          if (that.liveStream)
            that.liveStream(true, ()=>{}) // abort existing livestream

          pull(
            // listen for all new messages
            (that.liveStream = app.ssb.createLogStream({ live: true, gt: Date.now() })),
            pull.filter(obj => !obj.sync), // filter out the sync obj
            pull.asyncMap((msg, cb) => threadlib.decryptThread(app.ssb, msg, cb)),
            pull.drain((msg) => {
              if (!that.state.thread)
                return
              
              var c = msg.value.content
              var rels = mlib.relationsTo(msg, that.state.thread)
              // reply post to that thread?
              if (c.type == 'post' && (rels.indexOf('root') >= 0 || rels.indexOf('branch') >= 0)) {
                // add to thread and flatlist
                that.state.msgs.push(msg)
                that.state.thread.related = (that.state.thread.related||[]).concat(msg)
                that.setState({ thread: that.state.thread, msgs: that.state.msgs })

                // mark read
                thread.hasUnread = true
                threadlib.markThreadRead(app.ssb, that.state.thread, err => {
                  if (err)
                    app.minorIssue('Failed to mark live-streamed reply as read', err)
                })
              }
            })
          )
        }
      })
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

  onToggleUnread() {
    // mark unread in db
    let thread = this.state.thread
    app.ssb.patchwork.toggleRead(thread.key, (err, isRead) => {
      if (err)
        return app.minorIssue('Failed to mark unread', err, 'Happened in onMarkUnread of MsgThread')

      // re-render
      thread.isRead = isRead
      thread.hasUnread = !isRead
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

  openMsg(id) {
    app.history.pushState(null, '/msg/'+encodeURIComponent(id))
  }

  onSelectRoot() {
    let thread = this.state.thread
    let threadRoot = mlib.link(thread.value.content.root, 'msg')
    this.openMsg(threadRoot.link)
  }

  onCloseMsg() {
    app.emit('open:msg', null)
  }

  render() {
    const thread = this.state.thread
    const threadRoot = thread && mlib.link(thread.value.content.root, 'msg')
    const canMarkUnread = thread && (thread.isBookmarked || !thread.plaintext)
    return <div className="msg-thread">
      <div className="toolbar flex">
        { this.props.closeBtn ?
          <a className="btn" onClick={this.onCloseMsg.bind(this)}><i className="fa fa-times"/> Close</a>
          : '' }
        { threadRoot ?
          <a className="btn" onClick={this.onSelectRoot.bind(this)}><i className="fa fa-angle-double-up" /> Parent Thread</a>
          : '' }
        { !threadRoot && thread ?
          <BookmarkBtn onClick={()=>this.onToggleBookmark(thread)} isBookmarked={thread.isBookmarked} />
          : '' }
        { canMarkUnread ?
          <UnreadBtn onClick={this.onToggleUnread.bind(this)} isUnread={thread.hasUnread} />
          : '' }
      </div>
      <VerticalFilledContainer id="msg-thread-vertical">
        <ResponsiveElement widthStep={250}>
          <ReactCSSTransitionGroup component="div" className="items" transitionName="fade" transitionAppear={true} transitionAppearTimeout={500} transitionEnterTimeout={500} transitionLeaveTimeout={1}>
              { this.state.msgs.map((msg, i) => {
                const isFirst = (i === 0)
                return <Card
                  key={msg.key}
                  msg={msg}
                  noReplies
                  noBookmark
                  forceRaw={this.props.forceRaw}
                  forceOpen={isFirst}
                  onSelect={()=>this.openMsg(msg.key)}
                  onToggleStar={()=>this.onToggleStar(msg)}
                  onFlag={(msg, reason)=>this.onFlag(msg, reason)}
                  onToggleBookmark={()=>this.onToggleBookmark(msg)} />
              }) }
              { thread ? <div key="composer" className="container"><Composer key={thread.key} thread={thread} onSend={this.onSend.bind(this)} /></div> : '' }
          </ReactCSSTransitionGroup>
        </ResponsiveElement>
      </VerticalFilledContainer>
    </div>
  }
}
