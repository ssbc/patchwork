'use babel'
import React from 'react'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import app from '../lib/app'

export default class Search extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.value.timestamp, msg.value.author]
  }

  render() {
    const searchRegex = new RegExp(this.props.params.query||'', 'i')
    return <div id="search" key={this.props.params.query}>
      <MsgList
        ref="list"
        searchQuery={this.props.params.query}
        searchRegex={searchRegex}
        composerProps={{ isPublic: true }}
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        RightNav={RightNav}
        dateDividers
        ListItem={Card}
        live={{ gt: [Date.now(), null] }}
        emptyMsg="No results found."
        source={app.ssb.createLogStream} />
    </div>
  }
}