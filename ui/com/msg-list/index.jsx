'use babel'
import pull from 'pull-stream'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import mlib from 'ssb-msgs'
import ReactInfinite from 'react-infinite'
import SimpleInfinite from '../simple-infinite'
import Summary from './summary'
import Notifications from '../notifications'
import Composer from '../composer'
import { Thread } from '../msg-view'
import Tabs from '../tabs'
import { VerticalFilledContainer, verticalFilled } from '../'
import { isaReplyTo } from '../../lib/msg-relation'
import app from '../../lib/app'
import u from '../../lib/util'

// used when live msgs come in, how many msgs, from the top, should we check for deduplication?
const DEDUPLICATE_LIMIT = 100

export default class MsgList extends React.Component {
  constructor(props) {
    super(props)
    this.botcursor = null
    this.state = {
      msgs: [],
      selected: null,
      isLoading: false,
      isAtEnd: false,
      searchQuery: false,
      activeFilter: props.filters ? props.filters[0] : null,
      containerHeight: window.innerHeight
    }
    this.liveStream = null

    // handlers
    this.handlers = {
      // - msg: message object to select
      // - isFreshMsg: bool, was the message loaded in somewhere other than the msg list?
      //   - if true, will splice it into the list
      onSelect: (thread, isFreshMsg) => {
        // deselect toggle
        if (this.state.selected === thread)
          return this.setState({ selected: false })

        // splice the thread into the list, if it's new
        // that way, operations on the selected message will be reflected in the list
        if (isFreshMsg) {
          for (var i=0; i < this.state.msgs.length; i++) {
            if (this.state.msgs[i].key === thread.key) {
              this.state.msgs.splice(i, 1, thread)
              break
            }
          }
        }

        // update UI
        this.setState({ selected: thread, msgs: this.state.msgs })

        // mark read in DB
        if (!thread.hasUnread)
          return
        u.markThreadRead(thread, (err) => {
          if (err)
            return app.minorIssue('Failed to mark thread as read', err)

          // update UI again
          this.setState({ selected: thread, msgs: this.state.msgs })
        })
      },
      onDeselect: () => { this.setState({ selected: false }) },
      onMarkSelectedUnread: () => {
        // get the last post in the thread, abort if already unread
        let selected = this.state.selected
        if (!selected || selected.hasUnread) return

        // mark unread in db
        app.ssb.patchwork.markUnread(selected.key, (err) => {
          if (err)
            return app.minorIssue('Failed to mark unread', err, 'Happened in onMarkSelectedUnread of MsgList')

          // re-render
          selected.isRead = false
          selected.hasUnread = true
          this.state.selected = false
          this.setState(this.state)
        })
      },
      onToggleBookmark: (msg) => {
        // toggle in the DB
        app.ssb.patchwork.toggleBookmark(msg.key, (err, isBookmarked) => {
          if (err)
            return app.issue('Failed to toggle bookmark', err, 'Happened in onToggleBookmark of MsgList')

          // re-render
          msg.isBookmarked = isBookmarked
          this.setState(this.state)
        })
      },
      onToggleSelectedBookmark: () => {
        let selected = this.state.selected
        if (!selected) return
        this.handlers.onToggleBookmark(selected)
      },
      onToggleStar: (msg) => {
        // get current state
        msg.votes = msg.votes || {}
        let oldVote = msg.votes[app.user.id]
        let newVote = (oldVote === 1) ? 0 : 1

        // publish new message
        var voteMsg = schemas.vote(msg.key, newVote)
        let done = (err) => {
          if (err)
            return app.issue('Failed to publish vote', err, 'Happened in onToggleStar of MsgList')

          // re-render
          msg.votes[app.user.id] = newVote
          this.setState(this.state)
        }
        if (msg.plaintext)
          app.ssb.publish(voteMsg, done)
        else {
          let recps = mlib.links(msg.value.content.recps).map(l => l.link)
          app.ssb.private.publish(voteMsg, recps, done)
        }
      },
      onNewPost: (msg) => {
        this.setState({ selected: msg })
      },
      onNewReply: (msg) => {
        if (!this.props.refreshOnReply)
          return
        // reload selected. 
        // this is used when the live-stream wont update the thread for us, such as in the profile-view
        u.getParentPostThread(msg.key, (err, thread) => {
          if (err)
            return app.issue('Failed to fetch thread', err, 'This occurred after a reply, in a MsgList with refreshOnReply on')
          for (var i=0; i < this.state.msgs.length; i++) {
            if (this.state.msgs[i].key === thread.key) {
              this.state.msgs.splice(i, 1, thread)
              break
            }
          }
          this.setState({ selected: thread, msgs: this.state.msgs })
        })
      },
      onSelectFilter: (filter) => {
        this.setState({ activeFilter: filter }, () => this.reload())
      }
      // :TODO: restore search
      // onSearchKeydown: (e) => {
      //   // enter pressed?
      //   if (e.keyCode !== 13)
      //     return

      //   // set the query and reload messages
      //   let query = this.refs.searchInput.getDOMNode().value
      //   if (query.trim())
      //     query = new RegExp(query.trim(), 'i')
      //   else
      //     query = false
      //   this.setState({ searchQuery: query, msgs: [], isAtEnd: false }, () => {
      //     this.botcursor = null
      //     this.loadMore(30)
      //   })
      // }
    }
  }

  componentDidMount() {
    // load first messages
    this.loadMore(30)

    // setup autoresizing
    this.calcContainerHeight()
    this.resizeListener = this.calcContainerHeight.bind(this)
    window.addEventListener('resize', this.resizeListener)

    // setup livestream
    if (this.props.live)
      this.setupLivestream()
  }
  componentWillUnmount() {
    // stop autoresizing
    window.removeEventListener('resize', this.resizeListener)
    // abort livestream
    if (this.liveStream)
      this.liveStream(true, ()=>{})
  }

  loadingElement() {
    return <div className="msg-list-item summary">
      Loading...
    </div>
  }

  reload() {
    this.setState({ msgs: [], isAtEnd: false }, () => {
      this.botcursor = null
      this.loadMore(30)
    })
  }

  setupLivestream() {
    let source = this.props.source || app.ssb.createFeedStream
    let opts = (typeof this.props.live == 'object') ? this.props.live : {}
    opts.live = true
    this.liveStream = source(opts)
    pull(
      this.liveStream,
      (this.props.filter) ? pull.filter(this.props.filter) : undefined,
      pull.asyncMap(this.processMsg.bind(this)),
      (this.state.activeFilter) ? pull.filter(this.state.activeFilter.fn) : undefined,
      // :TODO: restore search
      // (this.state.searchQuery) ? pull.filter(this.searchQueryFilter.bind(this)) : undefined,
      pull.drain(msg => {
        // remove any noticeable duplicates...
        // check if the message is already in the first N and remove it if so
        for (var i=0; i < this.state.msgs.length && i < DEDUPLICATE_LIMIT; i++) {
          if (this.state.msgs[i].key === msg.key) {
            this.state.msgs.splice(i, 1)
            break
          }
        }
        // add to start of msgs
        var selected = this.state.selected
        if (selected && selected.key === msg.key)
          selected = msg // update selected, in case we replaced the current msg
        this.state.msgs.unshift(msg)
        this.setState({ msgs: this.state.msgs, selected: selected })
      })
    )
  }

  calcContainerHeight() {
    var height = window.innerHeight
    if (this.refs && this.refs.container) {
      var rect = this.refs.container.getDOMNode().getClientRects()[0]
      if (!rect)
        return
      height = window.innerHeight - rect.top
    }
    this.setState({ containerHeight: height })
  }

  processMsg(msg, cb) {
    // fetch thread data and decrypt
    if (this.props.threads) {
      u.getPostThread(msg.key, cb)
    } else
      u.decryptThread(msg, () => { cb(null, msg) })
  }

  searchQueryFilter(thread) {
    // iterate the thread and its posts, looking for matches
    let query = this.state.searchQuery
    if (checkMatch(thread))
      return true
    if (!thread.related)
      return false
    for (var i=0; i < thread.related.length; i++) {
      if (checkMatch(thread.related[i]))
        return true
    }
    return false

    function checkMatch (msg) {
      if (msg.value.content.type !== 'post' || (msg !== thread && !isaReplyTo(msg, thread)))
        return false
      // console.log('check match', query.test(''+msg.value.content.text), msg.value.content.text)
      return query.test(''+msg.value.content.text)
    }
  }

  loadMore(amt) {
    if (this.state.isLoading || this.state.isAtEnd)
      return

    let numFetched = 0
    let source = this.props.source || app.ssb.createFeedStream
    let cursor = this.props.cursor || ((msg) => { if (msg) { return msg.value.timestamp } })
    let updatedMsgs = this.state.msgs

    // helper to fetch a batch of messages
    let fetchBottomBy = (amt, cb) => {
      amt = amt || 50
      var lastmsg
      pull(
        source({ reverse: true, limit: amt, lt: cursor(this.botcursor) }),
        pull.through(msg => { lastmsg = msg }), // track last message processed
        pull.asyncMap(this.processMsg.bind(this)),
        (this.props.filter) ? pull.filter(this.props.filter) : undefined,
        (this.state.activeFilter) ? pull.filter(this.state.activeFilter.fn) : undefined,
        // :TODO: restore search
        // (this.state.searchQuery) ? pull.filter(this.searchQueryFilter.bind(this)) : undefined,
        pull.collect((err, msgs) => {
          if (err)
            console.warn('Error while fetching messages', err)

          // add to messages
          if (msgs.length) {
            numFetched += msgs.length
            updatedMsgs = updatedMsgs.concat(msgs)
          }

          // nothing new? stop
          if (!lastmsg || (this.botcursor && this.botcursor.key == lastmsg.key))
            return cb(true)
          this.botcursor = lastmsg

          // fetch more if needed
          var remaining = amt - msgs.length
          if (remaining > 0)
            return fetchBottomBy(remaining, cb)

          // we're done
          cb(false)
        })
      )
    }

    // fetch amount requested
    this.setState({ isLoading: true })
    fetchBottomBy(amt, isAtEnd => {
      this.setState({
        isLoading: false,
        isAtEnd: isAtEnd,
        msgs: updatedMsgs
      })
    })
  }

  render() {
    let Infinite = this.props.listItemHeight ? ReactInfinite : SimpleInfinite // use SimpleInfinite if we dont know the height of each elem
    let ListItem = this.props.ListItem || Summary
    let selectedKey = this.state.selected && this.state.selected.key
    let isEmpty = (!this.state.isLoading && this.state.msgs.length === 0)
    return <div className={'msg-list'+(this.state.selected?' msg-is-selected':'')}>
      <div className="msg-list-items">
        <Infinite
          ref="container"
          elementHeight={this.props.listItemHeight||60}
          containerHeight={this.state.containerHeight}
          infiniteLoadBeginBottomOffset={this.state.isAtEnd ? undefined : 1200}
          onInfiniteLoad={this.loadMore.bind(this, 30)}
          loadingSpinnerDelegate={this.loadingElement()}
          isInfiniteLoading={this.state.isLoading} >
          <div className="msg-list-ctrls toolbar">
            { this.props.filters ? <Tabs options={this.props.filters} selected={this.state.activeFilter} onSelect={this.handlers.onSelectFilter} /> : '' }
          </div>
          { isEmpty ?
            <em>
              { this.state.searchQuery ?
                'No results found' :
                (this.props.emptyMsg || 'No new messages') }
            </em>
            :
            <div>
              { this.state.msgs.map((m, i) => {
                return <ListItem key={i} msg={m} {...this.handlers} selected={selectedKey === m.key} forceRaw={this.props.forceRaw} />
              }) }
            </div>
          }
        </Infinite>
      </div>
      <div className="msg-list-view">
        { this.state.selected === 'composer' ?
          <Composer onSend={this.handlers.onNewPost.bind(this)} /> :
          this.state.selected ? 
            <Thread thread={this.state.selected} forceRaw={this.props.forceRaw} {...this.handlers} /> : 
            this.props.defaultView ? 
              this.props.defaultView() :
              '' }
      </div>
    </div>
  }
}