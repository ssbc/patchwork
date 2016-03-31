'use babel'
import React from 'react'
import { Link } from 'react-router'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from '../com/msg-list'
import Oneline from '../com/msg-view/oneline'
import Dropdown from '../com/dropdown'
import app from '../lib/app'

export default class InboxPosts extends React.Component {
  getIndexName() {
    return ({
      inbox: 'inbox',
      mentions: 'mentions',
      private: 'privatePosts',
      watching: 'bookmarks'
    })[this.props.params.view||'inbox'] || 'inbox'
  }

  getIndexFn() {
    return ({
      inbox: app.ssb.patchwork.createInboxStream,
      mentions: app.ssb.patchwork.createMentionStream,
      private: app.ssb.patchwork.createPrivatePostStream,
      watching: app.ssb.patchwork.createBookmarkStream
    })[this.props.params.view||'inbox'] || app.ssb.patchwork.createInboxStream
  }

  getUnreadCount() {
    return ({
      inbox: app.indexCounts.inboxUnread,
      mentions: app.indexCounts.mentionUnread,
      private: app.indexCounts.privateUnread,
      watching: app.indexCounts.bookmarkUnread
    })[this.props.params.view||'inbox'] || 0
  }

  cursor (msg) {
    if (msg)
      return [msg.ts, false]
  }

  onMarkAllRead() {
    app.ssb.patchwork.markAllRead(this.getIndexName(), err => {
      if (err)
        app.issue('Failed to mark all read', err)
    })
  }

  render() {
    // setup params based on view, and whether we're looking at archived items
    const showArchived = this.props.location.query.archived || !!this.props.params.view
    const hasUnread = this.getUnreadCount() > 0
    const view = this.props.params.view || 'inbox'
    const viewLabel = view
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
      const markAllReadItems = [{ label: 'Are you sure? Click here to confirm.', onSelect: this.onMarkAllRead.bind(this) }]
      return <RightNav>
        <hr className="labeled" data-label={viewLabel} />
        <Dropdown className="btn hint--top-left" data-hint="Mark all messages on this page as 'read'." items={markAllReadItems} right>
          <i className="fa fa-envelope" /> Mark all read
        </Dropdown>
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
        showMissing
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
