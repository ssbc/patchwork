'use babel'
import React from 'react'
import {Link} from 'react-router'
import mlib from 'ssb-msgs'
import threadlib from 'patchwork-threads'
import onImageLoaded from 'image-loaded'
import multicb from 'multicb'
import ClipboardBtn from 'react-clipboard.js'
import { MsgLink, UserLink, UserLinks, UserPic, NiceDate } from '../index'
import { Block as Content, Inline as ContentInline } from '../msg-content'
import { Inline as MdInline } from '../markdown'
import Modal from '../modals/single'
import FlagMsgForm from '../forms/flag-msg'
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

class BookmarkBtn extends React.Component {
  onClick(e) {
    e.stopPropagation()
    this.props.onClick()
  }
  render() {
    const b = this.props.isBookmarked
    const title = 'Bookmark'+(b?'ed':'')
    const hint = (b?'Remove this message from your bookmarks':'Add this message to your bookmarks')
    return <span>
      <a href='javascript:;' className={'hint--bottom save'+(this.props.isBookmarked?' selected':'')} data-hint={hint} onClick={this.onClick.bind(this)} title={title}>
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
    let label = 'Dig this'
    if (this.props.upvoters.length)
      label = 'Dug by '+this.props.upvoters.map(u.getName).join(', ')
    return <div className={'dig hint--top-left'+(this.props.isUpvoted?' highlighted':'')} onClick={this.onClick.bind(this)} data-hint={label}>
      <i className="fa fa-hand-peace-o" /> <span>{this.props.upvoters.length}</span>
    </div>
  }
}

export default class Card extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isExpanded: false,
      isViewingRaw: false,
      subject: null,
      isFlagModalOpen: false
    }
    this.changeCounter = props.msg.changeCounter || 0
  }

  isExpanded() {
    return this.props.forceExpanded || this.props.listView || this.state.isExpanded || (this.props.msg && !this.props.msg.isRead)
  }

  isCollapsable() {
    return !this.props.forceExpanded && !this.props.listView && this.isExpanded()
  }

  onSelect() {
    this.props.onSelect(this.props.msg)
  }

  onToggleDataView(item) { 
    this.setState({ isViewingRaw: !this.state.isViewingRaw })
    this.markShouldUpdate()
  }

  onClickExpand(e) {
    if (this.props.listView)
      this.onSelect()
    else if (!this.isExpanded()) {
      e.preventDefault()
      this.setState({ isExpanded: true })
    }
  }

  onClickCollapse(e) {
    if (this.isExpanded()) {
      e.preventDefault()
      this.setState({ isExpanded: false })
    }    
  }

  onSubmitFlag(reason) {
    this.props.onFlag(this.props.msg, reason)
    this.setState({ isFlagModalOpen: false })
    this.markShouldUpdate()
  }

  onFlag(item) {
    this.setState({ isFlagModalOpen: true })
    this.markShouldUpdate()
  }
  
  onUnflag(item) {
    this.props.onFlag(this.props.msg, 'unflag')
  }

  onCloseFlagModal() {
    this.setState({ isFlagModalOpen: false })
    this.markShouldUpdate()
  }

  componentDidMount() {
    // load subject msg, if needed
    let msg = this.props.msg
    if (msg.value && msg.value.content.type === 'vote') {
      let vote = mlib.link(msg.value.content.vote, 'msg')
      if (vote) {
        app.ssb.get(vote.link, (err, subject) => {
          if (!subject)
            return
          subject = { key: vote.link, value: subject }
          threadlib.decryptThread(app.ssb, subject, () => {
            this.setState({ subject: subject })
          })
        })
      }
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    // this is a performance hack in react
    // we avoid extraneous render() calls (esp in the msg-list) by returning false
    // the changeCounter is tracked on message objects and incremented when an update is made
    if (nextProps.selectiveUpdate) {
      var shouldUpdate = this.changeCounter !== nextProps.msg.changeCounter
      this.changeCounter = nextProps.msg.changeCounter
      return shouldUpdate
    }
    return true
  }

  markShouldUpdate() {
    // the message's change counter increments when it needs to be rendered
    // if some state in this object changes, we decrement to get the same effect
    this.changeCounter--
  }

  render() {
    const msg = this.props.msg
    if (msg.isNotFound)
      return this.renderNotFound(msg)
    if (msg.isLink)
      return this.renderLink(msg)
    if (msg.isMention)
      return this.renderMention(msg)
    const upvoters = getVotes(this.props.msg, userId => msg.votes[userId] === 1)
    const downvoters = getVotes(this.props.msg, userId => userIsTrusted(userId) && msg.votes[userId] === -1)
    const isUpvoted = upvoters.indexOf(app.user.id) !== -1
    const isDownvoted = downvoters.indexOf(app.user.id) !== -1
    // if (msg.value.content.type == 'post' && downvoters.length > upvoters.length && !this.state.isExpanded)
      // return this.renderMuted(msg)
    return this.renderPost(msg, upvoters, downvoters, isUpvoted, isDownvoted)
  }

  renderNotFound(msg) {
    const expanded = this.state.isExpanded
    return <div key={msg.key} className={'msg-view card-missing-post'+(expanded?'':' collapsed')}>
      <div>
        <a onClick={this.onClickExpand.bind(this)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          <i className="fa fa-warning" /> Missing Post
        </a>
        { expanded ?
          <span>
            <br/><br/>
            {'This post has not been downloaded. It may be authored by somebody outside of your network. Some of the other messages in this thread may reference it.'}
            <br/><br/>
            <code>{msg.key}</code>
          </span> :
          ' Missing post.' }
      </div>
    </div>
  }

  renderLink(msg) {
    return <div key={msg.key} className="msg-view card-missing-post">
      <div><i className="fa fa-angle-double-up" /> <MsgLink id={msg.key} name="View the full discussion" /></div>
    </div>
  }

  renderMention(msg) {
    const name = u.shortString(msg.value.content.text || msg.key, 100)
    return <div key={msg.key} className="msg-view card-mention">
      <div>
        <i className="fa fa-hand-o-right" />
        <div><UserLink id={msg.value.author} /> referenced this thread in <MsgLink id={msg.key} name={name} /></div>
      </div>
    </div>
  }

  renderMuted(msg) {
    const text = msg.value.content.text
    return <div className={'msg-view card-muted'}>
      <div className="ctrls"><UserPic id={msg.value.author} /></div>
      <div className="content">
        <div><a onClick={this.onClickExpand.bind(this)}><MdInline limit={INLINE_LENGTH_LIMIT} md={text} /></a> <small>flagged</small></div>
        <div><NiceDate ts={msg.value.timestamp} /></div>
      </div>
    </div>
  }

  renderPost(msg, upvoters, downvoters, isUpvoted, isDownvoted) {
    const replies = countReplies(msg)
    const isListView   = this.props.listView
    const isViewingRaw = this.state.isViewingRaw
    const channel = msg && msg.value && msg.value.content && msg.value.content.channel
    
    const dropdownOpts = [
      {
        value: 'copy-link',
        Com: props => <ClipboardBtn component='li' data-clipboard-text={msg.key} onSuccess={props.onClick}>
          <i className="fa fa-external-link" /> Copy ID
        </ClipboardBtn>
        // onSelect: this.markShouldUpdate.bind(this)
      },
      { 
        value: 'toggle-raw',
        label: <span><i className={isViewingRaw?'fa fa-envelope-o':'fa fa-gears'} /> View {isViewingRaw?'Msg':'Data'}</span>,
        onSelect: this.onToggleDataView.bind(this)
      },
      (isDownvoted ?
        { value: 'unflag', label: <span><i className="fa fa-times" /> Unflag</span>, onSelect: this.onUnflag.bind(this) } :
        { value: 'flag',   label: <span><i className="fa fa-flag" /> Flag</span>,    onSelect: this.onFlag.bind(this) }
      )
    ]

    const isExpanded   = this.isExpanded()
    const collapsedCls = (isExpanded?'':'collapsed')
    const collapsableCls = (this.isCollapsable()?'collapsable':'')
    const newCls       = (msg.isNew?'new':'')
    const listViewCls  = (isListView?'list-view':'')
    const unreadCls    = (msg.hasUnread?'unread':'')
    return <div className={`msg-view card-post ${collapsedCls} ${collapsableCls} ${newCls} ${listViewCls} ${unreadCls}`} onClick={this.onClickExpand.bind(this)}>
      <div className="flex">
        <div className="left-meta">
          <UserPic id={msg.value.author} />
        </div>
        <div className="content">
          <div className="header">
            <div className="header-left">
              <UserLink id={msg.value.author} />{' '}
              { isListView
                ? ''
                : <Link className="date" to={'/msg/'+encodeURIComponent(msg.key)}><NiceDate ts={msg.value.timestamp} /></Link> }
            </div>
            { /*!this.props.noBookmark ? <BookmarkBtn isBookmarked={msg.isBookmarked} onClick={()=>this.props.onToggleBookmark(msg)} /> : ''*/'' }
            { isListView
              ? <div className="header-right">
                  { channel ? <span className="channel"><Link to={`/channel/${channel}`}>#{channel}</Link></span> : '' }
                </div>
              : <div className="header-right">
                  { this.isCollapsable() ? <a className="collapse-btn" onClick={this.onClickCollapse.bind(this)}><i className="fa fa-angle-up"/></a> : '' }
                  <DropdownBtn items={dropdownOpts} right><i className="fa fa-ellipsis-h" /></DropdownBtn>
                </div> }
          </div>
          <div className="body" ref="body">
            { isExpanded
              ? <Content       msg={msg} forceRaw={isViewingRaw||this.props.forceRaw} />
              : <ContentInline msg={msg} forceRaw={isViewingRaw||this.props.forceRaw} /> }
          </div>
          <div className="footer">
            { replies > 0 && msg.hasUnread ? <div style={{margin:0}}>new replies</div> : '' }
            <div className="flex-fill"/>
            <DigBtn onClick={()=>this.props.onToggleStar(msg)} isUpvoted={isUpvoted} upvoters={upvoters} />
          </div>
        </div>
      </div>
      { isListView && replies > 0
        ? <div className="replies">
            { getLastTwoPosts(msg).map(r => {
              return <div className="reply"><UserLink id={r.value.author} /> <ContentInline msg={r}/></div>
            }) }
            { replies > 2 ? <div className="reply">{ replies-2 } more replies</div> : '' }
          </div>
        : '' }
      <Modal isOpen={this.state.isFlagModalOpen} onClose={this.onCloseFlagModal.bind(this)} Form={FlagMsgForm} formProps={{msg: msg, onSubmit: this.onSubmitFlag.bind(this)}} nextLabel="Publish" />
    </div>
  }
}

function getLastTwoPosts (msg) {
  var lastTwo = threadlib.flattenThread(msg).slice(-2)
  if (lastTwo[0].key == msg.key)
    return [lastTwo[1]] // dont let the original be included
  return lastTwo
}

