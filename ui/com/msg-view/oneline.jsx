'use babel'
import React from 'react'
import mlib from 'ssb-msgs'
import threadlib from 'patchwork-threads'
import { UserLink, UserPic, NiceDate } from '../index'
import { Inline as Content } from '../msg-content'
import { countReplies } from '../../lib/msg-relation'
import app from '../../lib/app'
import u from '../../lib/util'

export default class Oneline extends React.Component {
  constructor(props) {
    super(props)
    this.changeCounter = props.msg.changeCounter || 0
  }
  onClick() {
    this.props.onSelect(this.props.msg)
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (nextProps.selectiveUpdate) {
      var shouldUpdate = this.changeCounter !== nextProps.msg.changeCounter
      this.changeCounter = nextProps.msg.changeCounter
      return shouldUpdate
    }
    return true
  }

  render() {
    const msg = this.props.msg
    const lastMsg = !this.props.forceRaw ? threadlib.getLastThreadPost(msg) : false
    let replies = countReplies(msg)
    replies = (replies === 0) ? <span style={{color:'#bbb'}}>1</span> : <span>{replies+1}</span>

    var labelIcons = []
    if (!msg.plaintext)   labelIcons.push(<i className="fa fa-lock" />)
    // if (msg.mentionsUser) labelIcons.push(<i className="fa fa-at" />)
    // if (msg.isBookmarked) labelIcons.push(<i className="fa fa-bookmark" />)
    var label = labelIcons.length ? (<div className="label">{labelIcons}</div>) : ''

    return <div className={'msg-view oneline'+(msg.hasUnread ? ' unread' : '')+(!msg.plaintext ? ' private' : '')} onClick={this.onClick.bind(this)}>
      <div className="authors">
        <UserPic id={msg.value.author} />
        <UserLink id={msg.value.author} />
      </div>
      { !this.props.noReplies ? <div className="replies">{replies}</div> : '' }
      <div className="content">
        <Content msg={msg} forceRaw={this.props.forceRaw} />
      </div>
      {''/*<div className="date"><NiceDate ts={(lastMsg||msg).value.timestamp} /></div>*/}
      { label }
    </div>
  }
}