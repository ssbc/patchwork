'use babel'
import React from 'react'
import MsgList from '../msg-list'
import Summary from '../msg-view/summary'
import Tabs from '../tabs'
import app from '../../lib/app'

const FILTERS = [
  { label: 'All', fn: msg => true },
  { label: 'Unread', fn: msg => msg.hasUnread },
  { label: 'Private', fn: msg => !msg.plaintext }
]

export default class Bookmarks extends React.Component {
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

    return <div className="bookmarks">
      <MsgList
        ref="list"
        ListItem={Summary}
        listItemProps={{ noReply: true }}
        Toolbar={Toolbar}
        filter={this.state.filter.fn}
        emptyMsg="No messages."
        source={app.ssb.patchwork.createBookmarkStream}
        cursor={this.cursor} 
        live={{ gt: [Date.now(), false] }} />
    </div>
  }
}