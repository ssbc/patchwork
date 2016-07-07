'use babel'
import React from 'react'
import TopNav from '../com/topnav'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from 'patchkit-msg-list'
import Card from 'patchkit-msg-view/card'
import Thread from 'patchkit-flat-msg-thread'
import app from '../lib/app'
import t from 'patchwork-translations'

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
        TopNav={TopNav} topNavProps={{ searchQuery: this.props.params.query, composer: true, composerProps: { isPublic: true } }}
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        RightNav={RightNav}
        ListItem={Card} listItemProps={{ listView: true }}
        Thread={Thread} threadProps={{ suggestOptions: app.suggestOptions, channels: app.channels }}
        emptyMsg={t('NoResults')}
        source={source}
        cursor={cursor} />
    </div>
  }
}