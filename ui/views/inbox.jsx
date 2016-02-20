'use babel'
import React from 'react'
import { Link } from 'react-router'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import app from '../lib/app'

export default class InboxPosts extends React.Component {
  getIndexName() {
    const view = this.props.params.view || 'inbox'
    return ({
      inbox: 'inbox',
      mentions: 'mentions',
      private: 'privatePosts',
      watching: 'bookmarks'
    })[view] || 'inbox'
  }

  getIndexFn() {
    const view = this.props.params.view || 'inbox'
    return ({
      inbox: app.ssb.patchwork.createInboxStream,
      mentions: app.ssb.patchwork.createMentionStream,
      private: app.ssb.patchwork.createPrivatePostStream,
      watching: app.ssb.patchwork.createBookmarkStream
    })[view] || app.ssb.patchwork.createInboxStream
  }

  getUnreadCount() {
    return app.indexCounts[this.getIndexName()+'Unread']
  }

  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  onMarkAllRead() {
    if (confirm('Mark all messages read. Are you sure?')) {
      app.ssb.patchwork.markAllRead(this.getIndexName(), err => {
        if (err)
          app.issue('Failed to mark all read', err)
      })
    }
  }

  render() {
    // setup params based on view, and whether we're looking at archived items
    const showArchived = this.props.location.query.archived
    const hasUnread = this.getUnreadCount() > 0
    const view = this.props.params.view || 'inbox'
    const viewLabel = view.charAt(0).toUpperCase() + view.slice(1)
    const archivedUrl = this.props.location.pathname + '?archived=1'
    const source = opts => {
      opts.unread = !showArchived
      return this.getIndexFn()(opts)
    }

    // components for rightnav and the end of the list
    const Append = (hasUnread && !showArchived)
      ? (props => <div className="empty-msg"><Link to={archivedUrl}>View Archived</Link></div>)
      : false
    const ThisRightNav = props => {
      return <RightNav>
        <hr className="labeled" data-label={viewLabel} />
        <a className="btn" onClick={this.onMarkAllRead.bind(this)} href="javascript:"><i className="fa fa-envelope" /> Mark all read</a>
      </RightNav>
    }
    const emptyMsg = showArchived
      ? <div>Your inbox is empty.</div>
      : <div> You have no unread messages. <Link to={archivedUrl}>View Archived</Link></div>

    // render
    return <div id="inbox" key={view+(showArchived?'-all':'-unread')}>
      <MsgList
        ref="list"
        threads
        dateDividers
        composer composerProps={{ isPublic: false }}
        ListItem={Oneline} listItemProps={{ userPic: true }}
        LeftNav={LeftNav} leftNavProps={{ location: this.props.location }}
        RightNav={ThisRightNav}
        Append={Append}
        live={{ gt: [Date.now(), null] }}
        emptyMsg={emptyMsg}
        source={source}
        cursor={this.cursor} />
    </div>
  }
}
