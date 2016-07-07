'use babel'
import React from 'react'
import { Link } from 'react-router'
import TopNav from '../com/topnav'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from 'patchkit-msg-list'
import Thread from 'patchkit-flat-msg-thread'
import Notification from 'patchkit-msg-view/notification'
import app from '../lib/app'
import t from 'patchwork-translations'

export default class Notices extends React.Component {
  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }
  render() {
    return <div id="notices">
      <MsgList
        ref="list"
        threads
        dateDividers
        ListItem={Notification} listItemProps={{ userPic: true }}
        Thread={Thread} threadProps={{ suggestOptions: app.suggestOptions, channels: app.channels }}
        TopNav={TopNav} topNavProps={{ composer: true, composerProps: { isPublic: true } }}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        RightNav={RightNav}
        live={{ gt: [Date.now(), null] }}
        emptyMsg={t('NoDigs')}
        source={app.ssb.patchwork.createNoticeStream}
        cursor={this.cursor} />
    </div>
  }
}
