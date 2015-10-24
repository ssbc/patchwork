'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import { UserLink, UserLinks, UserPic, NiceDate } from '../index'
import { Block as Content } from '../msg-content'
import { Notification } from '../notifications'
import { countReplies } from '../../lib/msg-relation'
import u from '../../lib/util'

const MAX_CONTENT_HEIGHT = 400 // px

function getUpvotes (msg) {
  if (!msg.votes) return []
  return Object.keys(msg.votes).filter(k => (msg.votes[k] === 1))
}

export default class Summary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { isOversized: false, subject: null }
  }

  onClick() {
    this.props.onSelect(this.props.msg)
  }

  componentDidMount() {
    // load subject msg, if needed
    let msg = this.props.msg
    if (msg.value.content.type === 'vote') {
      let vote = mlib.link(msg.value.content.vote, 'msg')
      if (vote) {
        app.ssb.get(vote.link, (err, subject) => {
          if (!subject)
            return
          subject = { key: vote.link, value: subject }
          u.decryptThread(subject, () => {
            this.setState({ subject: subject })
          })
        })
      }
    }

    // is the card oversized?
    if (!this.refs.body)
      return
    let el = this.refs.body.getDOMNode()
    if (el.getClientRects()[0].height > MAX_CONTENT_HEIGHT) {
      this.setState({ isOversized: true })
    }
  }

  render() {
    if (this.props.msg.value.content.type == 'post')
      return this.renderPost()
    return this.renderAction()
  }

  renderPost() {
    let msg = this.props.msg
    let upvoters = getUpvotes(this.props.msg)
    let replies = countReplies(msg)
    let unreadReplies = countReplies(msg, m => !m.isRead)
    return <div className={'msg-list-item card-post' + (this.state.isOversized?' oversized':'')} onClick={this.onClick.bind(this)}>
      <div className="ctrls">
        <UserPic id={msg.value.author} />
        <div><i className="fa fa-bookmark-o" /> Save</div>
      </div>
      <div className="content">
        <div className="header">
          <div className="header-left">
            <UserLink id={msg.value.author} />{' '}
            {msg.plaintext ? '' : <i className="fa fa-lock"/>} {msg.mentionsUser ? <i className="fa fa-at"/> : ''}
          </div>
          <div className="header-right"><NiceDate ts={msg.value.timestamp} /></div>
        </div>
        <div className="body" ref="body">
          <Content msg={msg} forceRaw={this.props.forceRaw} />
        </div>
        <div className="signallers">
          <a><i className="fa fa-hand-peace-o" /> Dig it</a>
          <a><i className="fa fa-flag" /></a>
        </div>
        <div className="signals">
          { upvoters.length ? <div className="upvoters"><i className="fa fa-hand-peace-o"/> by <UserLinks ids={upvoters}/></div> : ''}
          { replies ? (replies === 1 ? '1 reply ' : (replies + ' replies ')) : '' }
          { unreadReplies ? <strong>{unreadReplies} new</strong> : '' }
        </div>
      </div>
    </div>
  }

  renderAction() {
    let msg = this.props.msg
    return <div className={'msg-list-item card-action'}>
      <div className="ctrls"><UserPic id={msg.value.author} /></div>
      <div className="content">
        <div><Notification msg={msg} subject={this.state.subject} onSelect={this.props.onSelect} /></div>
        <div><NiceDate ts={msg.value.timestamp} /></div>
      </div>
    </div>
  }
}