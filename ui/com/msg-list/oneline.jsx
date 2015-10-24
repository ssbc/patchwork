'use babel'
import React from 'react'
import { UserLink, NiceDate } from '../index'
import { Inline as Content } from '../msg-content'
import { countReplies } from '../../lib/msg-relation'
import u from '../../lib/util'

export default class Oneline extends React.Component {
  onClick() {
    this.props.onSelect(this.props.msg)
  }

  render() {
    let msg = this.props.msg
    let lastMsg = !this.props.forceRaw ? u.getLastThreadPost(msg) : false
    var replies = countReplies(msg)
    replies = (replies === 0) ? '' : '('+(replies+1)+')'
    return <div className={'msg-list-item oneline'+(msg.hasUnread ? ' unread' : '')} onClick={this.onClick.bind(this)}>
      <div className="bookmark">
        <a onClick={(e)=>{e.stopPropagation(); this.props.onToggleBookmark(msg)}}>
          { msg.isBookmarked ?
            <i className="fa fa-bookmark" /> :
            <i className="fa fa-bookmark-o" /> }
        </a>
      </div>
      <div className="authors">
        <UserLink id={msg.value.author} /> {replies}
      </div>
      <div className="type">
        { msg.plaintext ? '' : <i className="fa fa-lock" title="Secret Message" /> }
      </div>
      <div className="content">
        <Content msg={msg} forceRaw={this.props.forceRaw} />
      </div>
      <div className="date"><NiceDate ts={(lastMsg||msg).value.timestamp} /></div>
    </div>
  }
}