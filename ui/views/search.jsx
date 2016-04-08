'use babel'
import React from 'react'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from '../com/msg-list'
import Card from 'patchkit-msg-view/card'
import app from '../lib/app'

export default class Search extends React.Component {

  render() {
    const source = opts => {
      opts.query = this.props.params.query
      return app.ssb.patchwork.createSearchStream(opts)
    }
    const cursor = msg => {
      if (msg)
        return msg.ts
    }
    return <div id="search" key={this.props.params.query}>
      <MsgList
        ref="list"
        threads
        dateDividers
        batchLoadAmt={5}
        composerProps={{ isPublic: true }}
        searchQuery={this.props.params.query}
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        RightNav={RightNav}
        ListItem={Card} listItemProps={{ listView: true }}
        emptyMsg="No results found."
        source={source}
        cursor={cursor} />
    </div>
  }
}