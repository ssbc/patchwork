'use babel'
import React from 'react'
import { Link } from 'react-router'
import mlib from 'ssb-msgs'
import threadlib from 'patchwork-threads'
import { UserPic, UserLink, NiceDate } from '../index'
import { Inline as Content } from '../msg-content'
import { countReplies } from '../../lib/msg-relation'
import u from '../../lib/util'

export default class Summary extends React.Component {
  onClick(e) {
    // make sure the user didnt click on a link
    for (var el = e.nativeEvent.target; el; el = el.parentNode) {
      if (el === e.currentTarget)
        break // found the msg-view top without finding any anchors, good to go
      if (el.tagName === 'A')
        return // click was on a link inside of msg-view, let the default behavior occur
    }
    this.props.onSelect(this.props.msg)
  }

  render() {
    const msg = this.props.msg
    const lastMsg = !this.props.forceRaw ? threadlib.getLastThreadPost(msg) : false
    const channel = msg && msg.value && msg.value.content && msg.value.content.channel
    var replies = countReplies(msg)
    replies = (replies === 0) ? '' : '('+(replies+1)+')'
    return <div className={'msg-view summary'+(this.props.selected ? ' selected' : '')+(msg.hasUnread ? ' unread' : '')} onClick={this.onClick.bind(this)}>
      { this.props.userPic ?
        <div className="left-meta">
          <UserPic id={msg.value.author} />
        </div> : '' }
      <div className="content">
        <div className="header">
          <div className="header-left">
            { msg.plaintext ? '' : <i className="fa fa-lock"/> } <UserLink id={msg.value.author} />{' '}
            { replies }{' '}
            { msg.mentionsUser ? <i className="fa fa-at"/> : '' }{' '}
            { channel ? <span className="channel">in <Link to={`/public/channel/${channel}`}>#{channel}</Link></span> : '' }
          </div>
          <div className="header-right"><NiceDate ts={(lastMsg||msg).value.timestamp} /></div>
        </div>
        <div className="body">
          <div className="body-line"><Content msg={msg} forceRaw={this.props.forceRaw} /></div>
          { !this.props.noReply && lastMsg && lastMsg !== msg ?
            <div className="body-line"><Content msg={lastMsg} /></div> :
            '' }
        </div>
      </div>
    </div>
  }
}