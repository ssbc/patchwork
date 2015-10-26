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

class SaveBtn extends React.Component {
  onClick(e) {
    e.stopPropagation()
    this.props.onClick()
  }
  render() {
    let b = this.props.isBookmarked
    return <div>
      <a className={'save'+(this.props.isBookmarked?' selected':'')} onClick={this.onClick.bind(this)}>
        <i className={'fa fa-bookmark'+(b?'':'-o')} /> Save{b?'d':''}
      </a>
    </div>
  }
}

class DigBtn extends React.Component {
  onClick(e) {
    e.stopPropagation()
    this.props.onClick()
  }
  render() {
    let label = this.props.isUpvoted ? 'Dug it' : 'Dig it'
    return <a className={'vote'+(this.props.isUpvoted?' selected':'')} title={label} onClick={this.onClick.bind(this)}>
      <i className="fa fa-hand-peace-o" /> {label}
    </a>
  }
}

export default class Summary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { isOversized: false, subject: null }
  }

  onSelect() {
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
    if (this.props.msg.value.content.type == 'post' || this.props.forceRaw)
      return this.renderPost()
    return this.renderAction()
  }

  renderPost() {
    let msg = this.props.msg
    let upvoters = getUpvotes(this.props.msg)
    let isUpvoted = upvoters.indexOf(app.user.id) !== -1
    let replies = countReplies(msg)
    let unreadReplies = countReplies(msg, m => !m.isRead)
    return <div className={'msg-list-item card-post' + (this.state.isOversized?' oversized':'')}>
      <div className="ctrls">
        <UserPic id={msg.value.author} />
        <div><a onClick={this.onSelect.bind(this)}><i className="fa fa-reply" /> Reply</a></div>
        <SaveBtn isBookmarked={msg.isBookmarked} onClick={()=>this.props.onToggleBookmark(msg)} />
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
          { this.state.isOversized ? <div className="read-more" onClick={this.onSelect.bind(this)}><a>Read more</a></div> : ''}
        </div>
        <div className="signallers">
          <DigBtn onClick={()=>this.props.onToggleStar(msg)} isUpvoted={isUpvoted} />
          <a className="flag"><i className="fa fa-flag" /></a>
        </div>
        <div className="signals">
          { upvoters.length ? <div className="upvoters"><i className="fa fa-hand-peace-o"/> by <UserLinks ids={upvoters}/></div> : ''}
          { replies ?
            <a onClick={this.onSelect.bind(this)}>
              {replies === 1 ? '1 reply ' : (replies + ' replies ')}
              { unreadReplies ? <strong>{unreadReplies} new</strong> : '' }
            </a> : '' }
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