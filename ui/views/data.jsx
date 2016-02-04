'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import LeftNav from '../com/leftnav'
import app from '../lib/app'

export default class Data extends React.Component {
  render() {
    const source = opts => {
      return app.ssb.createLogStream(opts)
    }
    return <div id="data">
      <MsgList
        forceRaw
        composer composerProps={{ isPublic: true }}
        ListItem={Oneline} listItemProps={{noReplies: true}}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        source={source}
        live={{ gt: Date.now() }} />
    </div>
  }
}