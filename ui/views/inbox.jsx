'use babel'
import React from 'react'
import { Link } from 'react-router'
import TopNav from '../com/topnav'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from 'patchkit-msg-list'
import Thread from 'patchkit-flat-msg-thread'
import Oneline from 'patchkit-msg-view/oneline'
import DropdownBtn from 'patchkit-dropdown'
import app from '../lib/app'
import t from 'patchwork-translations'

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
        app.issue(t('MarkAllReadFail'), err)
    })
  }

  render() {
    // setup params based on view, and whether we're looking at archived items
    const showArchived = this.props.location.query.archived || !!this.props.params.view
    const hasUnread = this.getUnreadCount() > 0
    const view = t(this.props.params.view || 'inbox')
    const viewLabel = view
    const archivedUrl = this.props.location.pathname + '?archived=1'
    const source = opts => {
      opts.unread = !showArchived
      return this.getIndexFn()(opts)
    }

    // components for rightnav and the end of the list
    const Append = (hasUnread && !showArchived)
      ? (props => <div className="empty-msg"><Link to={archivedUrl}>{t('View Archived')}</Link></div>)
      : undefined
    const ThisRightNav = props => {
      const markAllReadItems = [{ label: t('MarkAllReadConfirm'), onSelect: this.onMarkAllRead.bind(this) }]
      return <RightNav>
        <hr className="labeled" data-label={viewLabel} />
        <DropdownBtn className="btn hint--top-left" hint={t('MarkAllReadHint')} items={markAllReadItems} right>
          <i className="fa fa-envelope" /> {t('MarkAllRead')}
        </DropdownBtn>
      </RightNav>
    }
    const emptyMsg = showArchived
      ? <div>{t('InboxEmpty')}</div>
      : <div> {t('NoUnread')} <Link to={archivedUrl}>{t('ViewArchived')}</Link></div>

    // render
    return <div id="inbox" key={view+(showArchived?'-all':'-unread')}>
      <MsgList
        ref="list"
        threads
        dateDividers
        showMissing
        ListItem={Oneline} listItemProps={{ userPic: true }}
        Thread={Thread} threadProps={{ suggestOptions: app.suggestOptions, channels: app.channels }}
        TopNav={TopNav} topNavProps={{ composer: true, composerProps: { isPublic: false } }}
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
