'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import { UserLink, UserLinks, NiceDate } from '../index'
import { Block as BlockContent, Inline as InlineContent } from '../msg-content'
import { isaReplyTo } from '../../lib/msg-relation'
import Composer from '../composer'
import app from '../../lib/app'
import u from '../../lib/util'

function getUpvotes (msg) {
  if (!msg.votes) return []
  return Object.keys(msg.votes).filter(k => (msg.votes[k] === 1))
}

export class MsgViewStar extends React.Component {
  onClick(e) {
    e.stopPropagation()
    this.props.onClick()
  }
  render() {
    return <a title={this.props.isUpvoted?'Unstar':'Star'} onClick={this.onClick.bind(this)}>
      <i className={'fa '+(this.props.isUpvoted?'fa-star':'fa-star-o')} /> {this.props.num}
    </a>
  }
}

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
    let recps = mlib.links(msg.value.content.recps).map(recp => u.getName(recp.link))
    let upvoters = getUpvotes(this.props.msg)
    let isUpvoted = upvoters.indexOf(app.user.id) !== -1
    if (this.state.collapsed) {
      return <div className="msg-view-collapsed" onClick={this.onClick.bind(this)}>
        <div className="msg-view-collapsed-col">{u.getName(msg.value.author)}</div>
        <div className="msg-view-collapsed-col"><InlineContent msg={msg} forceRaw={this.props.forceRaw} /></div>
        <div className="msg-view-collapsed-col">
          <NiceDate ts={msg.value.timestamp} />{' '}
          <MsgViewStar num={upvoters.length} isUpvoted={isUpvoted} onClick={this.props.onToggleStar} />
        </div>
      </div>
    }
    return <div className="msg-view" style={{height: this.props.height}}>
      <div className="header">
        <div>
          <UserLink id={msg.value.author} />{' '}
          { msg.plaintext ?
            <span style={{color: '#aaa'}}>public</span> :
            (recps && recps.length) ?
              <span style={{color: '#aaa'}}>to {recps.join(', ')}</span> :
              <span style={{color: '#aaa'}}><i className="fa fa-lock" /></span>}
        </div>
        <div>
          <NiceDate ts={msg.value.timestamp} />{' '}
          <MsgViewStar num={upvoters.length} isUpvoted={isUpvoted} onClick={this.props.onToggleStar} />
        </div>
      </div>
      <div className="body">
        {this.props.forceRaw ? <div>{msg.key}</div> : ''}
        <BlockContent msg={msg} forceRaw={this.props.forceRaw} />
      </div>
      { upvoters.length ? <div className="upvoters"><i className="fa fa-star"/> by <UserLinks ids={upvoters}/></div> : ''}
    </div>
  }
}

export class Thread extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      thread: null,
      isReplying: false,
      forceRaw: false,
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
      isReplying: (this.state.thread && thread.key === this.state.thread.key) ? this.state.isReplying : false,
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

  toggleRaw() {
    this.setState({ forceRaw: !this.state.forceRaw })
  }

  onSend(msg) {
    this.setState({ isReplying: false })
    if (this.props.onSend)
      this.props.onSend(msg)
  }

  render() {
    let forceRaw = this.state.forceRaw||this.props.forceRaw
    return <div className="msg-view-thread" style={{height: this.props.height}}>
      <div className="toolbar flex">
        <div className="flex-fill">
          <a className="btn" onClick={this.props.onDeselect} title="Close">Close</a>{' '}
          <a className="btn" onClick={this.props.onMarkSelectedUnread} title="Mark Unread"><i className="fa fa-eye-slash" /></a>{' '}
          <a className={'btn'+(this.props.thread.isBookmarked?' highlighted gold':'')} onClick={this.props.onToggleSelectedBookmark} title="Bookmark">
            { this.props.thread.isBookmarked ?
              <i className="fa fa-bookmark" /> :
              <i className="fa fa-bookmark-o" /> }
          </a>{' '}
          <a className="btn" onClick={()=>this.setState({ isReplying: true })}><i className="fa fa-reply"/> Reply</a>{' '}
          {this.props.thread.plaintext ? 
            <span style={{color: 'gray', marginLeft: '5px'}}>public thread</span> :
            <span style={{color: 'gray', marginLeft: '5px'}}><i className="fa fa-lock"/> private thread</span>}
        </div>
        <div>
          <a className={'btn '+(this.state.forceRaw?'highlighted':'')} onClick={this.toggleRaw.bind(this)} title="View Raw Data"><i className="fa fa-code" /></a>
        </div>
      </div>
      {this.state.msgs.map((msg, i) => {
        let isLast = (i === this.state.msgs.length-1)
        return <MsgView key={msg.key} msg={msg} forceRaw={forceRaw} isLast={isLast} onToggleStar={()=>this.props.onToggleStar(msg)} />
      })}
      {this.state.isReplying ?
        <Composer key={this.props.thread.key} thread={this.props.thread} onSend={this.onSend.bind(this)} /> :
        '' }
    </div>
  }
}