'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import ssbref from 'ssb-ref'
import threadlib from 'patchwork-threads'
import { MsgLink, UserLink, UserPic } from 'patchkit-links'
import NiceDate from 'patchkit-nicedate'
import { Inline as MdInline } from 'patchkit-markdown'
import Card from './card'
import u from '../../lib/util'
import app from '../../lib/app'

const INLINE_LENGTH_LIMIT = 100

export default class Notification extends React.Component {
  constructor(props) {
    super(props)
    this.state = { 
      subjectMsg: null // the message that `props.msg` is about (used by votes)
    } 
  }

  componentDidMount() {
    // load the subject msg
    const msg = this.props.msg

    if (msg) {
      if (msg.value.content.type == 'vote') {
        // `props.msg` is a vote, load the subject msg
        const vote = mlib.link(msg.value.content.vote, 'msg')
        if (!vote)
          return this.setState({ subjectMsg: null }) // malformed

        app.ssb.get(vote.link, (err, subjectMsg) => {
          if (subjectMsg) {
            subjectMsg = { key: vote.link, value: subjectMsg }
            threadlib.decryptThread(app.ssb, subjectMsg, () => this.setState({ subjectMsg: subjectMsg }))
          } else
            this.setState({ subjectMsg: null })
        })
        return
      }
      else if (this.isRootPost()) {
        // load the thread summary
        threadlib.getPostSummary(app.ssb, msg.key, (err, thread) => {
          if (thread)
            this.setState({ subjectMsg: thread })
        })
        return
      }
    }

    this.setState({ subjectMsg: null }) // no subject msg needed
  }

  isRootPost() {
    const msg = this.props.msg
    return msg && msg.value && msg.value.content && msg.value.content.type == 'post' && !msg.value.content.root
  }

  onSelect() {
    // get root msg
    var subject = this.state.subjectMsg || this.props.msg
    app.history.pushState(null, '/msg/'+encodeURIComponent(subject.key))
  }

  render() {
    const msg = this.props.msg

    if (this.isRootPost()) {
      // root posts will have their thread (summary) loaded into subjectMsg
      // use that if it's been loaded, otherwise fallback to the msg we have
      return <Card msg={this.state.subjectMsg || msg} listView onToggleStar={this.props.onToggleStar} onSelect={this.onSelect.bind(this)} />
    }

    const content = this.renderContent()
    return <div className={'msg-view notification'+((msg.isNew)?' new':'')}>
      <div className="ctrls"><UserPic id={msg.value.author} /></div>
      <div className="content">
        <div>{content}</div>
        <div><MsgLink id={msg.key}><NiceDate ts={msg.value.timestamp} /></MsgLink></div>
      </div>
    </div>
  }

  renderContent() {
    const msg = this.props.msg
    const c = msg.value.content
    switch (c.type) {
      case 'post':    return this.renderReply()
      case 'vote':    return this.renderVote()
      case 'contact': return this.renderContact()
      default:        return this.renderUnknown()
    }
    return false
  }

  renderReply() {
    // we're going to assume this post is a reply, because root posts go down a different code-path
    const msg = this.props.msg
    const c = msg.value.content
    const text = (c.text || 'this message')
    return <span>
      <a className="subject" onClick={this.onSelect.bind(this)}>
        <i className="fa fa-comment-o" /> <MdInline md={text}/>
      </a>
    </span>
  }

  renderVote() {
    const msg = this.props.msg
    const c = msg.value.content
    const vote = mlib.link(msg.value.content.vote)
    if (!vote || typeof vote.value !== 'number')
      return false

    const subject = (ssbref.isFeed(vote.link))
      ? <UserLink id={vote.link} />
      : <a className="subject" onClick={this.onSelect.bind(this)}><MdInline md={(this.state.subjectMsg && this.state.subjectMsg.value.content && this.state.subjectMsg.value.content.text || 'this message')} /></a>
    
    const icon = (c.vote.value > 0) ? 'fa fa-hand-peace-o' : (c.vote.value === 0) ? 'fa fa-times'            : 'fa fa-flag'
    const desc = (c.vote.value > 0) ? 'dug'                : (c.vote.value === 0) ? 'removed their vote for' : 'flagged'
    const reason = (c.vote.reason) ? ('as '+c.vote.reason) : ''
    return <span>
      <i className={icon} /> <UserLink id={msg.value.author} /> {desc} {subject} {reason}
    </span> 
  }

  renderContact() {
    const msg = this.props.msg
    const c = msg.value.content
    const pid = mlib.link(c.contact).link
    if (c.following === true) return <span><i className="fa fa-user-plus" /> <UserLink id={msg.value.author} /> followed <UserLink id={pid} /></span>
    if (c.blocking === true) return <span><i className="fa fa-microphone-slash" /> <UserLink id={msg.value.author} /> blocked <UserLink id={pid} /></span>
    if (c.following === false) return <span><i className="fa fa-user-times" /> <UserLink id={msg.value.author} /> unfollowed <UserLink id={pid} /></span>
  }

  renderUnknown() {
    const msg = this.props.msg
    const c = msg.value.content
    if (c.type)
      return <span>{c.type} message</span>
    return <span><i className="fa fa-lock" /> Encrypted message</span>
  }
}