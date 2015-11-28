'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import threadlib from 'patchwork-threads'
import { UserLink, UserPics, NiceDate } from '../index'
import { Inline as Content } from '../msg-content'
import { countReplies } from '../../lib/msg-relation'
import app from '../../lib/app'
import u from '../../lib/util'

export default class Oneline extends React.Component {
  onClick() {
    this.props.onSelect(this.props.msg)
  }

  render() {
    const msg = this.props.msg
    let recps = mlib.links(msg.value.content.recps, 'feed').map(link => link.link).filter(id => id !== app.user.id)
    if (recps.length === 0)
      recps = [msg.value.author]
    const lastMsg = !this.props.forceRaw ? threadlib.getLastThreadPost(msg) : false
    let replies = countReplies(msg)
    replies = (replies === 0) ? <span style={{color:'#bbb'}}>1</span> : <span>{replies+1}</span>
    return <div className={'msg-view oneline'+(msg.hasUnread ? ' unread' : '')} onClick={this.onClick.bind(this)}>
      <div className="bookmark">
        <a onClick={(e)=>{e.stopPropagation(); this.props.onToggleBookmark(msg)}}>
          { msg.isBookmarked ?
            <i className="fa fa-bookmark" /> :
            <i className="fa fa-bookmark-o" /> }
        </a>
      </div>
      <div className="type">{ msg.plaintext ? '' : <i className="fa fa-lock" title="Secret Message" /> }</div>
      <div className="authors"><UserPics ids={recps} /></div>
      <div className="replies">{replies}</div>
      <div className="content"><Content msg={msg} forceRaw={this.props.forceRaw} /></div>
      <div className="date"><NiceDate ts={(lastMsg||msg).value.timestamp} /></div>
    </div>
  }
}