'use babel'
import React from 'react'
import { UserLink, UserLinks, UserPic, NiceDate } from '../index'
import { Block as Content } from '../msg-content'
import { countReplies } from '../../lib/msg-relation'
import u from '../../lib/util'

function getUpvotes (msg) {
  if (!msg.votes) return []
  return Object.keys(msg.votes).filter(k => (msg.votes[k] === 1))
}

export default class Summary extends React.Component {
  onClick() {
    this.props.onSelect(this.props.msg)
  }

  render() {
    let msg = this.props.msg
    let upvoters = getUpvotes(this.props.msg)
    var replies = countReplies(msg)
    return <div className={'msg-list-item card'} onClick={this.onClick.bind(this)}>
      <div className="ctrls">
        <UserPic id={msg.value.author} />
        <div><i className="fa fa-bookmark-o" /> Save</div>
      </div>
      <div className="content">
        <div className="header">
          <div className="header-left">
            <UserLink id={msg.value.author} />{' '}
            {msg.plaintext ? '' : <i className="fa fa-lock"/>} {msg.mentionsUser ? <i className="fa fa-at"/> : ''}
          </div>
          <div className="header-right"><NiceDate ts={msg.value.timestamp} /></div>
        </div>
        <div className="body">
          <Content msg={msg} forceRaw={this.props.forceRaw} />
        </div>
        <div className="signallers">
          <a><i className="fa fa-hand-peace-o" /> Dig it</a>
          <a><i className="fa fa-flag" /></a>
        </div>
        <div className="signals">
          { upvoters.length ? <div className="upvoters"><i className="fa fa-hand-peace-o"/> by <UserLinks ids={upvoters}/></div> : ''}
          { replies ? (replies + ' replies') : '' }
        </div>
      </div>
    </div>
  }
}