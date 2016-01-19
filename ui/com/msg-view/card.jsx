'use babel'
import React from 'react'
import {Link} from 'react-router'
import mlib from 'ssb-msgs'
import threadlib from 'patchwork-threads'
import clipboard from 'clipboard'
import onImageLoaded from 'image-loaded'
import multicb from 'multicb'
import { MsgLink, UserLink, UserLinks, UserPic, NiceDate } from '../index'
import { Block as Content } from '../msg-content'
import { Inline as MdInline } from '../markdown'
import Modal from '../modals/single'
import FlagMsgForm from '../forms/flag-msg'
import { countReplies } from '../../lib/msg-relation'
import { Editor } from '../composer/index'
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

function isRevision(msg) {
  return msg.value.content.type === 'post-edit'
}

class BookmarkBtn extends React.Component {
  onClick(e) {
    e.stopPropagation()
    this.props.onClick()
  }
  render() {
    const b = this.props.isBookmarked
    const title = 'Bookmark'+(b?'ed':'')
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
    let label = this.props.isUpvoted ? 'Dug' : 'Dig'
    return <a className={'vote'+(this.props.isUpvoted?' selected':'')} title={label} onClick={this.onClick.bind(this)}>
      <i className="fa fa-hand-peace-o" /> {label.split('').map((l,i) => <span key={i}>{l}</span>)} <span>i</span><span>t</span>
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
      isEditing: false,
      subject: null,
      wasLinkCopied: null, // used by the link-copy behavior to give confirmation
      isFlagModalOpen: false
    }
    this.timeout = false // used by link-copy behavior to clear confirmation
  }

  onSelect() {
    this.props.onSelect(this.props.msg)
  }

  onToggleExpand() {
    this.setState({ isExpanded: !this.state.isExpanded })
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
      this.copyLink();
    else if (choice === 'flag')
      this.setState({ isFlagModalOpen: true });
    else if (choice === 'unflag')
      this.props.onFlag(this.props.msg, 'unflag');
    else if (choice === 'toggle-raw')
      this.setState({ isViewingRaw: !this.state.isViewingRaw });
    else if (choice === 'edit-post') {
      this.setState({ isEditing: !this.state.isEditing });
    }
  }

  onCancelEdit() {
    this.setState({ isEditing: !this.state.isEditing });
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
    let msg = this.props.msg;
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
    // is the card oversized?
    if (!this.refs.body)
      return
    // wait for images to finish loading
    var done = multicb()
    Array.from(this.refs.body.querySelectorAll('img')).forEach(el => onImageLoaded(el, done()));
    done(() => {
      // check height
      if (!this.refs.body)
        return;
      const rect = this.refs.body.getClientRects()[0];
      if (rect && rect.height > MAX_CONTENT_HEIGHT) {
        this.setState({ isOversized: true });
      }
    })
  }

  componentWillUnmount() {
    if (this.timeout)
      clearTimeout(this.timeout)
  }

  render() {

    const msg = this.props.msg
    if (msg.isNotFound)
      return this.renderNotFound(msg);
    if (msg.isLink)
      return this.renderLink(msg);
    if (msg.isMention)
      return this.renderMention(msg);

    const upvoters = getVotes(this.props.msg, userId => msg.votes[userId] === 1);
    const downvoters = getVotes(this.props.msg, userId => userIsTrusted(userId) && msg.votes[userId] === -1);
    const isUpvoted = upvoters.indexOf(app.user.id) !== -1;
    const isDownvoted = downvoters.indexOf(app.user.id) !== -1;

    if (this.state.isEditing)
      return this.renderEditor(msg, upvoters, downvoters, isUpvoted, isDownvoted);

    if ((msg.value.content.type == 'post' ||
         msg.value.content.type == 'post-edit') &&
        downvoters.length > upvoters.length &&
        !this.state.isExpanded)
      return this.renderMuted(msg);
    return this.renderPost(msg, upvoters, downvoters, isUpvoted, isDownvoted)
  }

  renderNotFound(msg) {
    const expanded = this.state.isExpanded
    return <div key={msg.key} className={'msg-view card-missing-post'+(expanded?' expanded':'')}>
      <div>
        <a onClick={this.onToggleExpand.bind(this)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>
          <i className="fa fa-warning" /> Missing Post
        </a>
        { expanded ?
          <span>
            <br/><br/>
            {'This post is by somebody outside of your network, and hasn\'t been downloaded. Some of the messages in this thread may reference it.'}
            <br/><br/>
            <code>{msg.key}</code>
          </span> :
          ' This post could not be loaded.' }
      </div>
    </div>
  }

  renderLink(msg) {
    const name = u.shortString(msg.value ? (msg.value.content.text || msg.key) : msg.key, 100)
    return <div key={msg.key} className="msg-view card-missing-post">
      <div><i className="fa fa-angle-up" /> <MsgLink id={msg.key} name={name} /></div>
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

  renderRevisionInfo(msg) {
    if (isRevision(msg)) {
      return (
        <div key={msg.key + "rev-ctrls"}>
          <a href="#">Revised <NiceDate ts={msg.value.timestamp} /></a>
        </div>)
    } else {
      return null
    }
  }

  renderMuted(msg) {
    const text = msg.value.content.text
    return <div className={'msg-view card-muted'}>
      <div className="ctrls"><UserPic id={msg.value.author} /></div>
      <div className="content">
        <div><a onClick={this.onToggleExpand.bind(this)}><MdInline limit={INLINE_LENGTH_LIMIT} md={text} /></a> <small>flagged</small></div>
        <div><NiceDate ts={msg.value.timestamp} /></div>
      </div>
    </div>
  }

  renderPost(msg, upvoters, downvoters, isUpvoted, isDownvoted) {

    const replies = countReplies(msg)
    const unreadReplies = countReplies(msg, m => !m.isRead)
    const isViewingRaw = this.state.isViewingRaw
    const channel = msg && msg.value && msg.value.content && msg.value.content.channel

    const dropdownOpts = [
      { value: 'copy-link',  label: <span><i className="fa fa-external-link" /> Copy Link</span> },
      { value: 'toggle-raw', label: <span><i className={isViewingRaw?'fa fa-envelope-o':'fa fa-gears'} /> View {isViewingRaw?'Msg':'Data'}</span> },
      (isDownvoted) ? 
        { value: 'unflag',   label: <span><i className="fa fa-times" /> Unflag</span> } :
        { value: 'flag',     label: <span><i className="fa fa-flag" /> Flag</span> }
    ]

    if (app.user.id === msg.value.author)
      dropdownOpts.unshift({ value: 'edit-post',
                             label: <span><i className="fa fa-pencil" /> Edit/Delete Post</span>
      });


    const oversizedCls = (this.state.isOversized?'oversized':'')
    const expandedCls  = (this.state.isExpanded?'expanded':'')
    const newCls       = (msg.isNew?'new':'')
    return <div className={`msg-view card-post ${oversizedCls} ${expandedCls} ${newCls}`}>
      <div className="left-meta">
        <UserPic id={msg.value.author} />
        <div><a onClick={this.onSelect.bind(this)}><NiceDate ts={msg.value.timestamp} /></a></div>
      </div>
      <div className="content">
        <div className="header">
          <div className="header-left">
            <UserLink id={msg.value.author} />{' '}
            {msg.plaintext ? '' : <i className="fa fa-lock"/>}{' '}
            {msg.mentionsUser ? <i className="fa fa-at"/> : ''}{' '}
            {channel ? <span className="channel">in <Link to={`/newsfeed/channel/${channel}`}>#{channel}</Link></span> : ''}
          </div>
          <div className="header-right">
            { this.state.wasLinkCopied ? <small>Copied!</small> : '' }
            { !this.props.noBookmark ? <BookmarkBtn isBookmarked={msg.isBookmarked} onClick={()=>this.props.onToggleBookmark(msg)} /> : '' }
            <DropdownBtn items={dropdownOpts} right onSelect={this.onSelectDropdown.bind(this)}><i className="fa fa-ellipsis-h" /></DropdownBtn>
          </div>
        </div>
        <div className="body" ref="body">
          <Content msg={msg} forceRaw={isViewingRaw||this.props.forceRaw} />
          { this.state.isOversized ? <div className="read-more" onClick={this.onToggleExpand.bind(this)}><a>Read more</a></div> : ''}
        </div>
        <div className="ctrls">
          { replies && !this.props.noReplies ?
            <div>
              <a onClick={this.onSelect.bind(this)}>
                {replies === 1 ? '1 reply ' : (replies + ' replies ')}
                { unreadReplies ? <strong>{unreadReplies} new</strong> : '' }
              </a>
            </div> : '' }
          { upvoters.length ? <div className="upvoters flex-fill"><i className="fa fa-hand-peace-o"/> by <UserLinks ids={upvoters}/></div> : ''}
          { downvoters.length ? <div className="downvoters flex-fill"><i className="fa fa-flag"/> by <UserLinks ids={downvoters}/></div> : ''}
          { !upvoters.length && !downvoters.length ? <div className="flex-fill" /> : '' }
          <div>{this.renderRevisionInfo(msg)}</div>
          <div><DigBtn onClick={()=>this.props.onToggleStar(msg)} isUpvoted={isUpvoted} /></div>
          { !this.props.noReplies ? <div><a onClick={this.onSelect.bind(this)}><i className="fa fa-reply" /> Reply</a></div> : '' }
        </div>
      </div>
      <Modal isOpen={this.state.isFlagModalOpen} onClose={this.onCloseFlagModal.bind(this)} Form={FlagMsgForm} formProps={{msg: msg, onSubmit: this.onSubmitFlag.bind(this)}} nextLabel="Publish" />
    </div>
  }

  renderEditor(msg, upvoters, downvoters, isUpvoted, isDownvoted) {
    const replies = countReplies(msg);
    const unreadReplies = countReplies(msg, m => !m.isRead);
    const isViewingRaw = this.state.isViewingRaw;
    const channel = msg && msg.value && msg.value.content && msg.value.content.channel;

    const oversizedCls = (this.state.isOversized?'oversized':'');
    const expandedCls  = (this.state.isExpanded?'expanded':'');
    const newCls       = (msg.isNew?'new':'');
    return <div className={`msg-view card-post ${oversizedCls} ${expandedCls} ${newCls}`}>
      <div className="left-meta">
        <UserPic id={msg.value.author} />
        <div><a onClick={this.onSelect.bind(this)}><NiceDate ts={msg.value.timestamp} /></a></div>
      </div>
      <div className="content">
        <div className="header">
          <div className="header-left">
            <UserLink id={msg.value.author} />{' '}
            {msg.plaintext ? '' : <i className="fa fa-lock"/>}{' '}
            {msg.mentionsUser ? <i className="fa fa-at"/> : ''}{' '}
            {channel ? <span className="channel">in <Link to={`/newsfeed/channel/${channel}`}>#{channel}</Link></span> : ''}
          </div>
          <div className="header-right">
            { this.state.wasLinkCopied ? <small>Copied!</small> : '' }
            { !this.props.noBookmark ? <BookmarkBtn isBookmarked={msg.isBookmarked} onClick={()=>this.props.onToggleBookmark(msg)} /> : '' }
          </div>
        </div>
        <div className="body" ref="body">
          <Editor {...this.props} isEditing="true"
                                  isPublic={msg.value.content.recps === undefined}
                                  editingContent={msg.value.content.text}
                                  onSend={this.onCancelEdit.bind(this)}
                                  onCancel={this.onCancelEdit.bind(this)}
                                  originalMessage={msg}/>
    
        </div>
        <div className="ctrls">
          { replies && !this.props.noReplies ?
            <div>
              <a onClick={this.onSelect.bind(this)}>
                {replies === 1 ? '1 reply ' : (replies + ' replies ')}
                { unreadReplies ? <strong>{unreadReplies} new</strong> : '' }
              </a>
            </div> : '' }
            { upvoters.length ? <div className="upvoters flex-fill"><i className="fa fa-hand-peace-o"/> by <UserLinks ids={upvoters}/></div> : ''}
            { downvoters.length ? <div className="downvoters flex-fill"><i className="fa fa-flag"/> by <UserLinks ids={downvoters}/></div> : ''}
            { !upvoters.length && !downvoters.length ? <div className="flex-fill" /> : '' }
            <div>{this.renderRevisionInfo(msg)}</div>
            <div><DigBtn onClick={()=>this.props.onToggleStar(msg)} isUpvoted={isUpvoted} /></div>
            { !this.props.noReplies ? <div><a onClick={this.onSelect.bind(this)}><i className="fa fa-reply" /> Reply</a></div> : '' }
        </div>
      </div>
      <Modal isOpen={this.state.isFlagModalOpen} onClose={this.onCloseFlagModal.bind(this)} Form={FlagMsgForm} formProps={{msg: msg, onSubmit: this.onSubmitFlag.bind(this)}} nextLabel="Publish" />
      </div>
  }
}
