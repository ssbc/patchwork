'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import threadlib from 'patchwork-threads'
import { UserLinks, NiceDate } from '../index'
import { Inline as Content } from '../msg-content'
import { countReplies } from '../../lib/msg-relation'
import u from '../../lib/util'

export default class Summary extends React.Component {
  onClick() {
    this.props.onSelect(this.props.msg)
  }

  render() {
    let msg = this.props.msg
    let recps = mlib.links(msg.value.content.recps, 'feed').map(link => link.link).filter(id => id !== app.user.id)
    if (recps.length === 0)
      recps = [msg.value.author]
    let lastMsg = !this.props.forceRaw ? threadlib.getLastThreadPost(msg) : false
    var replies = countReplies(msg)
    replies = (replies === 0) ? '' : '('+replies+')'
    return <div className={'msg-view summary'+(this.props.selected ? ' selected' : '')+(msg.hasUnread ? ' unread' : '')} onClick={this.onClick.bind(this)}>
      { this.props.ctrls ?
        <div className="ctrls">
          <a onClick={(e)=>{e.stopPropagation(); this.props.onToggleBookmark(msg)}}>
            { msg.isBookmarked ?
              <i className="fa fa-bookmark" /> :
              <i className="fa fa-bookmark-o" /> }
          </a>
        </div> : '' }
      <div className="content">
        <div className="header">
          <div className="header-left">
            { msg.plaintext ? '' : <i className="fa fa-lock"/> } <UserLinks ids={recps} />{' '}
            {replies} {msg.mentionsUser ? <i className="fa fa-at"/> : ''}
          </div>
          <div className="header-right"><NiceDate ts={(lastMsg||msg).value.timestamp} /></div>
        </div>
        <div className="body">
          <div className="body-line"><Content msg={msg} forceRaw={this.props.forceRaw} /></div>
          { lastMsg && lastMsg !== msg ?
            <div className="body-line"><Content msg={lastMsg} /></div> :
            '' }
        </div>
      </div>
    </div>
  }
}