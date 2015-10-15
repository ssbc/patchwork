'use babel'
import React from 'react'
import { UserLink, NiceDate } from '../index'
import { Inline as Content } from '../msg-content'
import { countReplies } from '../../lib/msg-relation'
import u from '../../lib/util'

export default class Summary extends React.Component {
  onClick() {
    this.props.onSelect(this.props.msg)
  }

  render() {
    let msg = this.props.msg
    let lastMsg = !this.props.forceRaw ? u.getLastThreadPost(msg) : false
    var replies = countReplies(msg)
    replies = (replies === 0) ? '' : ''+replies
    return <div className={'msg-list-item summary'+(this.props.selected ? ' selected' : '')+(msg.hasUnread ? ' unread' : '')} onClick={this.onClick.bind(this)}>
      <div className="header">
        <div className="header-left">
          <UserLink id={msg.value.author} />{' '}
          {replies} {msg.plaintext ? <i className="fa fa-group"/> : <i className="fa fa-lock"/>} {msg.mentionsUser ? <i className="fa fa-at"/> : ''}
        </div>
        <div className="header-right"><NiceDate ts={msg.value.timestamp} /></div>
      </div>
      <div className="body">
        <div className="body-line"><Content msg={msg} forceRaw={this.props.forceRaw} /></div>
        { lastMsg && lastMsg !== msg ?
          <div className="body-line"><Content msg={lastMsg} /></div> :
          '' }
      </div>
    </div>
  }
}