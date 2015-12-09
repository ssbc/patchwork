'use babel'
import React from 'react'
import MsgList from '../msg-list'
import Notification from '../msg-view/notification'
import Tabs from '../tabs'
import app from '../../lib/app'

const FILTERS = [
  { label: 'All', fn: msg => true },
  { label: <i className="fa fa-hand-peace-o"/>, fn: msg => msg.value.content.type === 'vote' },
  { label: <i className="fa fa-user-plus"/>, fn: msg => msg.value.content.type === 'contact' },
  { label: <i className="fa fa-at"/>, fn: msg => msg.value.content.type === 'post' }
]

export default class Notifications extends React.Component {
  constructor(props) {
    super(props)
    this.state = { filter: FILTERS[0] }
  }

  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  onSelectFilter(filter) {
    this.setState({ filter: filter }, () => {
      this.refs.list.reload()
    })
  }

  render() {
    const Toolbar = (props) => {
      return <div className="toolbar">
        <Tabs options={FILTERS} selected={this.state.filter} onSelect={this.onSelectFilter.bind(this)} />
      </div>
    }

    return <div className="notifications">
      <MsgList
        ref="list"
        ListItem={Notification}
        Toolbar={Toolbar}
        filter={this.state.filter.fn}
        emptyMsg="No notifications."
        source={app.ssb.patchwork.createNotificationsStream}
        cursor={this.cursor} 
        live={{ gt: [Date.now(), false] }} />
    </div>
  }
}