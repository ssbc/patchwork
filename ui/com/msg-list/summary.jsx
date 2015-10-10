'use babel'
import React from 'react'
import { UserLink, NiceDate } from '../index'
import { Inline as Content } from '../msg-content'
import { countReplies } from '../../lib/msg-relation'

export default class Summary extends React.Component {

  onClick() {
    this.props.onSelect(this.props.msg)
  }

  render() {
    let msg = this.props.msg
    var replies = countReplies(msg)
    replies = (replies === 0) ? '' : '('+replies+')'
    return <div className={'msg-list-item summary'+(this.props.selected ? ' selected' : '')} onClick={this.onClick.bind(this)}>
      <div className="header">
        <div className="header-left">
          <UserLink id={msg.value.author} />{' '}
          {replies} {msg.hasUnread ? 'unread' : ''} {msg.plaintext ? 'P' : 'S'} {msg.mentionsUser ? 'M' : ''}
        </div>
        <div className="header-right"><NiceDate ts={msg.value.timestamp} /></div>
      </div>
      <div className="body"><Content msg={msg} forceRaw={this.props.forceRaw} /></div>
    </div>
  }
}