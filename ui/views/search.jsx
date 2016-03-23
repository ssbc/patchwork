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
    const source = opts => {
      opts.query = this.props.params.query
      return app.ssb.patchwork.createSearchStream(opts)
    }
    return <div id="search" key={this.props.params.query}>
      <MsgList
        ref="list"
        dateDividers
        batchLoadAmt={5}
        composerProps={{ isPublic: true }}
        searchQuery={this.props.params.query}
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        RightNav={RightNav}
        ListItem={Card} listItemProps={{ listView: true }}
        emptyMsg="No results found."
        source={source} />
    </div>
  }
}