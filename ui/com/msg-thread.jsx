'use babel'
import React from 'react'
import { Link } from 'react-router'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group'
import mlib from 'ssb-msgs'
import schemas from 'ssb-msg-schemas'
import threadlib from 'patchwork-threads'
import pull from 'pull-stream'
import { UserLinks } from './index'
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
    return <a className={(b?' selected':'')} onClick={this.props.onClick} title={title}>
        <i className={'fa fa-bookmark'+(b?'':'-o')} /> {title}
    </a>
  }
}

class UnreadBtn extends React.Component {
  render() {
    const b = this.props.isUnread
    const title = (b?'Mark Read':'Mark Unread')
    const icon = 'fa fa-'+(b?'square-o':'check-square-o')
    return <a onClick={this.props.onClick} title={title}>
      <i className={icon} /> {title}
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
    // only construct for new threads
    if (this.state.thread && id === this.state.thread.key)
      return

    // load thread, but defer computing any knowledge
    threadlib.getPostThread(app.ssb, id, { isRead: false, isBookmarked: false, mentions: false, votes: false }, (err, thread) => {
      if (err)
        return app.issue('Failed to Load Message', err, 'This happened in msg-list componentDidMount')

      // compile thread votes
      threadlib.compileThreadVotes(thread)

      // flatten *before* fetching info on replies, to make sure that info is attached to the right msg object
      var flattenedMsgs = threadlib.flattenThread(thread)
      thread.related = flattenedMsgs.slice(1) // skip the first, root is in there
      threadlib.fetchThreadData(app.ssb, thread, { isRead: true, isBookmarked: true, mentions: true }, (err, thread) => {
        if (err)
          return app.issue('Failed to Load Message', err, 'This happened in msg-list componentDidMount')

        // note which messages start out unread, so they stay collapsed during this render
        flattenedMsgs.forEach(m => m.wasRead = m.isRead)

        // now set state
        this.setState({
          thread: thread,
          msgs: flattenedMsgs,
          isReplying: (this.state.thread && thread.key === this.state.thread.key) ? this.state.isReplying : false
        })

        // mark read
        if (thread.hasUnread) {
          threadlib.markThreadRead(app.ssb, thread, (err) => {
            if (err)
              return app.minorIssue('Failed to mark thread as read', err)
            this.setState({ thread: thread })
          })
        }

        // listen for new replies
        if (this.props.live) {
          if (this.liveStream)
            this.liveStream(true, ()=>{}) // abort existing livestream

          pull(
            // listen for all new messages
            (this.liveStream = app.ssb.createLogStream({ live: true, gt: Date.now() })),
            pull.filter(obj => !obj.sync), // filter out the sync obj
            pull.asyncMap((msg, cb) => threadlib.decryptThread(app.ssb, msg, cb)),
            pull.drain((msg) => {
              if (!this.state.thread)
                return
              
              var c = msg.value.content
              var rels = mlib.relationsTo(msg, this.state.thread)
              // reply post to this thread?
              if (c.type == 'post' && (rels.indexOf('root') >= 0 || rels.indexOf('branch') >= 0)) {
                // add to thread and flatlist
                this.state.msgs.push(msg)
                this.state.thread.related = (this.state.thread.related||[]).concat(msg)
                this.setState({ thread: this.state.thread, msgs: this.state.msgs })

                // mark read
                thread.hasUnread = true
                threadlib.markThreadRead(app.ssb, this.state.thread, err => {
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
    this.props.onDidMount && this.props.onDidMount()
  }
  componentWillReceiveProps(newProps) {
    this.constructState(newProps.id)
  }
  componentDidUpdate() {
    this.props.onDidMount && this.props.onDidMount()    
  }
  componentWillUnmount() {
    // abort the livestream
    if (this.liveStream)
      this.liveStream(true, ()=>{})
  }

  getScrollTop() {
    // helper to bring the thread into view
    const container = this.refs.container
    if (!container)
      return false
    return container.offsetTop
  }

  onClose() {
    this.props.onClose && this.props.onClose()
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

  onToggleBookmark(e) {
    e.preventDefault()
    e.stopPropagation()

    // toggle in the DB
    let thread = this.state.thread
    app.ssb.patchwork.toggleBookmark(thread.key, (err, isBookmarked) => {
      if (err)
        return app.issue('Failed to toggle bookmark', err, 'Happened in onToggleBookmark of MsgThread')

      // re-render
      thread.isBookmarked = isBookmarked
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

  onSelectRoot(e) {
    e.preventDefault()
    e.stopPropagation()
    const thread = this.state.thread
    const threadRoot = mlib.link(thread.value.content.root, 'msg')
    this.openMsg(threadRoot.link)
  }

  render() {
    const thread = this.state.thread
    const threadRoot = thread && mlib.link(thread.value.content.root, 'msg')
    const canMarkUnread = thread && (thread.isBookmarked || !thread.plaintext)
    const isPublic = (thread && thread.plaintext)
    const authorName = thread && u.getName(thread.value.author)
    const channel = thread && thread.value.content.channel
    const recps = thread && mlib.links(thread.value.content.recps, 'feed')

    return <div className="msg-thread" ref="container">
      { !thread
        ? <div style={{padding: 20, fontWeight: 300, textAlign:'center'}}>No thread selected.</div>
        : <ResponsiveElement widthStep={250}>
            <div className="flex thread-toolbar" onClick={this.onClose.bind(this)}>
              <div className="flex-fill">
                { (thread && thread.mentionsUser) ? <i className="fa fa-at"/> : '' }{' '}
                { (thread && thread.plaintext) ? '' : <i className="fa fa-lock"/> }{' '}
                { recps && recps.length
                  ? <span>To: <UserLinks ids={recps.map(r => r.link)} /></span>
                  : '' }
                { channel ? <span className="channel">in <Link to={`/public/channel/${channel}`}>#{channel}</Link></span> : ''}
              </div>
              { threadRoot
                ? <a onClick={this.onSelectRoot.bind(this)}><i className="fa fa-angle-double-up" /> Parent Thread</a>
                : '' }
              { !threadRoot && thread
                ? <BookmarkBtn onClick={this.onToggleBookmark.bind(this)} isBookmarked={thread.isBookmarked} />
                : '' }
              { thread
                ? <UnreadBtn onClick={this.onToggleUnread.bind(this)} isUnread={thread.hasUnread} />
                : '' }
            </div>
            <ReactCSSTransitionGroup component="div" className="items" transitionName="fade" transitionAppear={true} transitionAppearTimeout={500} transitionEnterTimeout={500} transitionLeaveTimeout={1}>
              { this.state.msgs.map((msg, i) => {
                const isLast = (i === this.state.msgs.length - 1)
                return <Card
                  key={msg.key}
                  msg={msg}
                  noReplies
                  noBookmark
                  forceRaw={this.props.forceRaw}
                  forceExpanded={isLast || !msg.wasRead}
                  onSelect={()=>this.openMsg(msg.key)}
                  onToggleStar={()=>this.onToggleStar(msg)}
                  onFlag={(msg, reason)=>this.onFlag(msg, reason)} />
              }) }
              <div key="composer" className="container"><Composer key={thread.key} thread={thread} onSend={this.onSend.bind(this)} /></div>
            </ReactCSSTransitionGroup>
          </ResponsiveElement>
      }
    </div>
  }
}