'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import clipboard from 'clipboard'
import { UserLink, UserLinks, UserPic, NiceDate } from '../index'
import { Block as Content } from '../msg-content'
import { Inline as MdInline } from '../markdown'
import { ModalContainer } from '../modals'
import { FlagMsgForm } from '../forms'
import { countReplies } from '../../lib/msg-relation'
import DropdownBtn from '../dropdown'
import u from '../../lib/util'
import app from '../../lib/app'
import social from '../../lib/social-graph'

const INLINE_LENGTH_LIMIT = 100
const MAX_CONTENT_HEIGHT = 400 // px

function getVotes (msg, filter) {
  if (!msg.votes) return []
  return Object.keys(msg.votes).filter(filter)
}

function userIsTrusted (userId) {
  return userId === app.user.id || social.follows(app.user.id, userId)
}

class SaveBtn extends React.Component {
  onClick(e) {
    e.stopPropagation()
    this.props.onClick()
  }
  render() {
    const b = this.props.isBookmarked
    const title = 'Save'+(b?'d':'')
    return <span>
      <a className={'save'+(this.props.isBookmarked?' selected':'')} onClick={this.onClick.bind(this)} title={title}>
        <i className={'fa fa-bookmark'+(b?'':'-o')} />
      </a>
    </span>
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

export default class Card extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isOversized: false,
      isExpanded: false,
      isViewingRaw: false,
      subject: null,
      wasLinkCopied: null, // used by the link-copy behavior to give confirmation
      isFlagModalOpen: false
    }
    this.timeout = false // used by link-copy behavior to clear confirmation
  }

  onSelect() {
    this.props.onSelect(this.props.msg)
  }

  onExpand() {
    this.setState({ isExpanded: true })
  }

  onSubmitFlag(reason) {
    this.props.onFlag(this.props.msg, reason)
    this.setState({ isFlagModalOpen: false })
  }

  onCloseFlagModal() {
    this.setState({ isFlagModalOpen: false })
  }

  onSelectDropdown(choice) {
    if (choice === 'copy-link')
      this.copyLink()
    else if (choice === 'flag')
      this.setState({ isFlagModalOpen: true })
    else if (choice === 'unflag')
      this.props.onFlag(this.props.msg, 'unflag')
    else if (choice === 'toggle-raw')
      this.setState({ isViewingRaw: !this.state.isViewingRaw })
  }

  copyLink() {
    clipboard.writeText(this.props.msg.key)
    this.setState({ wasLinkCopied: true })
    if (this.timeout)
      clearTimeout(this.timeout)
    this.timeout = setTimeout(() => {
      this.setState({ wasLinkCopied: false })
      this.timeout = null
    }, 3e3)
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
    const rect = this.refs.body.getClientRects()[0]
    if (rect && rect.height > MAX_CONTENT_HEIGHT) {
      this.setState({ isOversized: true })
    }
  }

  componentWillUnmount() {
    if (this.timeout)
      clearTimeout(this.timeout)
  }

  render() {
    const msg = this.props.msg
    const upvoters = getVotes(this.props.msg, userId => msg.votes[userId] === 1)
    const downvoters = getVotes(this.props.msg, userId => userIsTrusted(userId) && msg.votes[userId] === -1)
    const isUpvoted = upvoters.indexOf(app.user.id) !== -1
    const isDownvoted = downvoters.indexOf(app.user.id) !== -1
    if (msg.value.content.type == 'post' && downvoters.length > upvoters.length && !this.state.isExpanded)
      return this.renderMuted(msg)
    return this.renderPost(msg, upvoters, downvoters, isUpvoted, isDownvoted)
  }

  renderMuted(msg) {
    const text = msg.value.content.text
    return <div className={'msg-view card-muted'}>
      <div className="ctrls"><UserPic id={msg.value.author} /></div>
      <div className="content">
        <div><a onClick={this.onExpand.bind(this)}><MdInline limit={INLINE_LENGTH_LIMIT} md={text} /></a> <small>flagged</small></div>
        <div><NiceDate ts={msg.value.timestamp} /></div>
      </div>
    </div>
  }

  renderPost(msg, upvoters, downvoters, isUpvoted, isDownvoted) {
    const replies = countReplies(msg)
    const unreadReplies = countReplies(msg, m => !m.isRead)
    const isViewingRaw = this.state.isViewingRaw

    const dropdownOpts = [
      { value: 'copy-link',  label: <span><i className="fa fa-external-link" /> Copy Link</span> },
      { value: 'toggle-raw', label: <span><i className={isViewingRaw?'fa fa-envelope-o':'fa fa-gears'} /> View {isViewingRaw?'Msg':'Data'}</span> },
      (isDownvoted) ? 
        { value: 'unflag',   label: <span><i className="fa fa-times" /> Unflag</span> } :
        { value: 'flag',     label: <span><i className="fa fa-flag" /> Flag</span> }
    ]

    return <div className={'msg-view card-post' + (this.state.isOversized?' oversized':'') + (this.state.isExpanded?' expanded':'')}>
      <div className="left-meta">
        <UserPic id={msg.value.author} />
        <div><a onClick={this.onSelect.bind(this)}><NiceDate ts={msg.value.timestamp} /></a></div>
      </div>
      <div className="content">
        <div className="header">
          <div className="header-left">
            <UserLink id={msg.value.author} />{' '}
            {msg.plaintext ? '' : <i className="fa fa-lock"/>} {msg.mentionsUser ? <i className="fa fa-at"/> : ''}
          </div>
          <div className="header-right">
            { this.state.wasLinkCopied ? <small>Copied!</small> : '' }
            <DropdownBtn items={dropdownOpts} right onSelect={this.onSelectDropdown.bind(this)}><i className="fa fa-ellipsis-h" /></DropdownBtn>
            <SaveBtn isBookmarked={msg.isBookmarked} onClick={()=>this.props.onToggleBookmark(msg)} />
          </div>
        </div>
        <div className="body" ref="body">
          <Content msg={msg} forceRaw={isViewingRaw||this.props.forceRaw} />
          { this.state.isOversized ? <div className="read-more" onClick={this.onExpand.bind(this)}><a>Read more</a></div> : ''}
        </div>
        <div className="ctrls">
          { replies && !this.props.noReplies ?
            <div>
              <a onClick={this.onSelect.bind(this)}>
                {replies === 1 ? '1 reply ' : (replies + ' replies ')}
                { unreadReplies ? <strong>{unreadReplies} new</strong> : '' }
              </a>
            </div> : '' }
          { upvoters.length ? <div className="upvoters"><i className="fa fa-hand-peace-o"/> by <UserLinks ids={upvoters}/></div> : ''}
          { downvoters.length ? <div className="downvoters"><i className="fa fa-flag"/> by <UserLinks ids={downvoters}/></div> : ''}
          <div className="flex-fill" />
          <div><DigBtn onClick={()=>this.props.onToggleStar(msg)} isUpvoted={isUpvoted} /></div>
          { !this.props.noReplies ? <div><a onClick={this.onSelect.bind(this)}><i className="fa fa-reply" /> Reply</a></div> : '' }
        </div>
      </div>
      <ModalContainer isOpen={this.state.isFlagModalOpen} onRequestClose={this.onCloseFlagModal.bind(this)}>
        <FlagMsgForm msg={msg} onSubmit={this.onSubmitFlag.bind(this)} />
      </ModalContainer>
    </div>
  }
}