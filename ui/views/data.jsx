'use babel'
import React from 'react'
import MsgList from 'patchkit-msg-list'
import Oneline from 'patchkit-msg-view/oneline'
import Thread from 'patchkit-flat-msg-thread'
import TopNav from '../com/topnav'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import app from '../lib/app'

export default class Data extends React.Component {
  render() {
    const source = opts => {
      return app.ssb.createLogStream(opts)
    }
    return <div id="data">
      <MsgList
        forceRaw
        TopNav={TopNav} topNavProps={{ composer: true, composerProps: { isPublic: true } }}
        ListItem={Oneline} listItemProps={{noReplies: true}}
        Thread={Thread} threadProps={{ suggestOptions: app.suggestOptions, channels: app.channels }}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        RightNav={RightNav}
        source={source}
        live={{ gt: Date.now() }} />
    </div>
  }
}