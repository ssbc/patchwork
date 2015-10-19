'use babel'
import pull from 'pull-stream'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import mlib from 'ssb-msgs'
import Infinite from 'react-infinite'
import Summary from './summary'
import Notifications from '../notifications'
import Composer from '../composer'
import { Thread } from '../msg-view'
import { verticalFilled } from '../'
import app from '../../lib/app'
import u from '../../lib/util'

// used when live msgs come in, how many msgs, from the top, should we check for deduplication?
const DEDUPLICATE_LIMIT = 100

var ThreadVertical = verticalFilled(Thread)

export default class MsgList extends React.Component {
  constructor(props) {
    super(props)
    this.botcursor = null
    this.state = {
      msgs: [],
      selected: null,
      isLoading: false,
      isAtEnd: false,
      containerHeight: window.innerHeight
    }
    this.liveStream = null

    // handlers
    this.handlers = {
      onSelect: (msg) => {
        // deselect toggle
        if (this.state.selected === msg)
          return this.setState({ selected: false })

        // update UI
        this.setState({ selected: msg })

        // mark read in DB
        if (!msg.hasUnread)
          return
        u.markThreadRead(msg, (err) => {
          if (err)
            return app.minorIssue('Failed to mark thread as read', err)

          // update UI again
          this.setState({ selected: msg, msgs: this.state.msgs })
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
      }
    }
  }

  componentDidMount() {
    // load first messages
    this.loadMore(15)

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

  setupLivestream() {
    let source = this.props.source || app.ssb.createFeedStream
    let opts = (typeof this.props.live == 'object') ? this.props.live : {}
    opts.live = true
    this.liveStream = source(opts)
    pull(
      this.liveStream,
      (this.props.filter) ? pull.filter(this.props.filter) : undefined,
      pull.asyncMap(this.processMsg.bind(this)),
      pull.drain(msg => {
        // remove any noticeable duplicates...
        // check if the message is already in the first N and remove it if so
        for (var i=0; i < this.state.msgs.length && i < DEDUPLICATE_LIMIT; i++) {
          if (this.state.msgs[i].key === msg.key) {
            this.state.msgs.splice(i, 1)
            i--
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

  onSend(msg) {
    this.setState({ selected: msg })
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
    let selectedKey = this.state.selected && this.state.selected.key
    let isEmpty = (!this.state.isLoading && this.state.msgs.length === 0)
    return <div className={'msg-list'+(this.state.selected?' msg-is-selected':'')}>
      <div className="msg-list-items">
        <div className="msg-list-ctrls">
          <div className="compose"><a className="btn" onClick={()=>this.setState({ selected: 'composer' })}><i className="fa fa-edit" /></a></div>
          <div className="search">
            <input type="text" placeholder="Search" />
          </div>
        </div>
        { isEmpty ?
          <em ref="container">{this.props.emptyMsg || 'No new messages'}</em> :
          <Infinite
            ref="container"
            elementHeight={60}
            containerHeight={this.state.containerHeight}
            infiniteLoadBeginBottomOffset={this.state.isAtEnd ? undefined : 1200}
            onInfiniteLoad={this.loadMore.bind(this, 15)}
            loadingSpinnerDelegate={this.loadingElement()}
            isInfiniteLoading={this.state.isLoading} >
            {this.state.msgs.map((m, i) => {
              return <Summary key={i} msg={m} {...this.handlers} selected={selectedKey === m.key} forceRaw={this.props.forceRaw} />
            })}
          </Infinite> }
      </div>
      <div className="msg-list-view">
        { this.state.selected === 'composer' ?
          <Composer onSend={this.onSend.bind(this)} /> :
          this.state.selected ? 
            <ThreadVertical thread={this.state.selected} forceRaw={this.props.forceRaw} {...this.handlers} /> : 
            this.props.defaultView ? 
              this.props.defaultView() :
              <Notifications onSelect={this.handlers.onSelect} /> }
      </div>
    </div>
  }
}