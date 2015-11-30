'use babel'
import React from 'react'
import MsgList from './msg-list'
import Notification from './msg-view/notification'
import app from '../lib/app'

const FILTERS = [
  { label: 'All', fn: msg => true },
  { label: <span><i className="fa fa-hand-peace-o"/> Likes</span>, fn: msg => msg.value.content.type === 'vote' },
  { label: <span><i className="fa fa-user-plus"/> Follows</span>, fn: msg => msg.value.content.type === 'contact' },
  { label: <span><i className="fa fa-at"/> Mentions</span>, fn: msg => msg.value.content.type === 'post' }
]

export default class Notifications extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }
  render() {
    return <div className="notifications">
      <MsgList
        ListItem={Notification}
        emptyMsg="No new notifications."
        filters={FILTERS}
        source={app.ssb.patchwork.createNotificationsStream}
        cursor={this.cursor} 
        live={{ gt: [Date.now(), false] }} />
    </div>
  }
}

export default class FNB extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      isExpanded: false,
      count: 0
    }
    this.setCount = () => {
      this.setState({ count: app.indexCounts.notificationsUnread })
    }
  }
  componentDidMount() {
    // setup event stream
    app.on('update:all', this.setCount)
    app.on('update:indexCounts', this.setCount)
  }
  componentWillUnmount() {
    // abort streams
    app.removeListener('update:all', this.setCount)
    app.removeListener('update:indexCounts', this.setCount)
  }

  onClick() {
    this.setState({ isExpanded: !this.state.isExpanded })
  }

  render() {
    const count = this.state.count || ''
    return <div className={'fnb '+(this.props.className||'')+(this.state.isExpanded?' expanded':'')}>
      <div className="fnb-btn"><a className={count?'attention':''} data-count={count} onClick={this.onClick.bind(this)}><i className="fa fa-bell" /></a></div>
      { this.state.isExpanded ? <Notifications/> : '' }
    </div>
  }
}