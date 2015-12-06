'use babel'
import pull from 'pull-stream'
import moment from 'moment'
import React from 'react'
import ReactDOM from 'react-dom'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group'
import schemas from 'ssb-msg-schemas'
import mlib from 'ssb-msgs'
import ssbref from 'ssb-ref'
import threadlib from 'patchwork-threads'
import ReactInfinite from 'react-infinite'
import SimpleInfinite from './simple-infinite'
import Summary from './msg-view/summary'
import Tabs from './tabs'
import { VerticalFilledContainer, verticalFilled } from './index'
import { isaReplyTo } from '../lib/msg-relation'
import app from '../lib/app'
import u from '../lib/util'

// how many messages to fetch in a batch?
const DEFAULT_BATCH_LOAD_AMT = 30

// what's the avg height a message will be?
// (used in loading calculations, when trying to scroll to a specific spot. doesnt need to be exact)
const AVG_RENDERED_MSG_HEIGHT = 200

// used when live msgs come in, how many msgs, from the top, should we check for deduplication?
const DEDUPLICATE_LIMIT = 100


export default class MsgList extends React.Component {
  constructor(props) {
    super(props)
    this.botcursor = null
    this.state = {
      msgs: [],
      newMsgQueue: [], // used to store message updates that we dont want to render immediately
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
      onSelect: msg => {
        app.history.pushState(null, '/msg/' + encodeURIComponent(msg.key))
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
      onFlag: (msg, reason) => {
        if (!reason)
          throw new Error('reason is required')

        // publish new message
        const voteMsg = (reason === 'unflag') // special case
          ? schemas.vote(msg.key, 0)
          : schemas.vote(msg.key, -1, reason)
        let done = (err) => {
          if (err)
            return app.issue('Failed to publish flag', err, 'Happened in onFlag of MsgList')

          // re-render
          msg.votes = msg.votes || {}
          msg.votes[app.user.id] = (reason === 'unflag') ? 0 : -1
          this.setState(this.state)
        }
        if (msg.plaintext)
          app.ssb.publish(voteMsg, done)
        else {
          let recps = mlib.links(msg.value.content.recps).map(l => l.link)
          app.ssb.private.publish(voteMsg, recps, done)
        }
      },
      onSelectFilter: (filter) => {
        if (this.state.isLoading)
          return
        this.setState({ activeFilter: filter }, () => this.reload())
      }
    }
  }

  componentDidMount() {
    // load first messages
    var start = Date.now()
    this.loadMore({ amt: DEFAULT_BATCH_LOAD_AMT }, () => console.log(Date.now() - start))

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
    return <div className="msg-view summary">
      Loading...
    </div>
  }

  reload(newState) {
    this.setState({ isAtEnd: false, newMsgQueue: [], ...newState }, () => {
      this.botcursor = null
      this.loadMore({ amt: DEFAULT_BATCH_LOAD_AMT, fresh: true })
    })
  }

  // helper to change the actively-viewed message
  // - msg: message object to select
  // - isFreshMsg: bool, was the message loaded in somewhere other than the msg list?
  //   - if true, will splice it into the list
  selectThread(thread, isFreshMsg) {
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
  }
  deselectThread() {
    this.setState({ selected: false })
  }

  setupLivestream() {
    let source = this.props.source || app.ssb.createFeedStream
    let opts = (typeof this.props.live == 'object') ? this.props.live : {}
    opts.threads = true
    opts.live = true
    this.liveStream = source(opts)
    pull(
      this.liveStream,
      pull.filter(msg => !msg.sync),
      pull.asyncMap((msg, cb) => threadlib.decryptThread(app.ssb, msg, cb)), // decrypt the message
      (this.props.filter) ? pull.filter(this.props.filter) : undefined, // run the fixed filter
      pull.asyncMap(this.processMsg.bind(this)), // fetch the thread
      (this.state.activeFilter) ? pull.filter(this.state.activeFilter.fn) : undefined, // run the user-selected filter
      (this.state.searchQuery) ? pull.filter(this.searchQueryFilter.bind(this)) : undefined,
      pull.drain(msg => {

        if (this.props.queueNewMsgs) {
          // suppress if by the local user
          const lastMsg = threadlib.getLastThreadPost(msg)
          if (lastMsg && lastMsg.value.author === app.user.id)
            return this.prependNewMsg(msg)

          // queue the new msgs on the ui
          this.state.newMsgQueue.push(msg)
          this.setState({ newMsgQueue: this.state.newMsgQueue })
        } else {
          // immediately render
          msg.isLiveUpdate = true
          this.prependNewMsg(msg)
        }
      })
    )
  }

  calcContainerHeight() {
    var height = window.innerHeight
    if (this.refs && this.refs.container) {
      var rect = ReactDOM.findDOMNode(this.refs.container).getClientRects()[0]
      if (!rect)
        return
      height = window.innerHeight - rect.top
    }
    this.setState({ containerHeight: height })
  }

  // infinite load call
  onInfiniteLoad(scrollingTo) {
    var amt = DEFAULT_BATCH_LOAD_AMT
    if (scrollingTo) {
      // trying to reach a dest, increase amount to load with a rough guess of how many are needed
      amt = Math.max((scrollingTo / AVG_RENDERED_MSG_HEIGHT)|0, DEFAULT_BATCH_LOAD_AMT)
    }
    this.loadMore({ amt })
  }

  onSearchKeyDown(e) {
    if (e.keyCode == 13) { // on enter
      var query = e.target.value
      if (query && query.trim()) {
        if (ssbref.isLink(query)) {
          // a link, lookup
          if (ssbref.isFeedId(query)) {
            app.history.pushState(null, '/profile/'+encodeURIComponent(query))
          } else if (ssbref.isMsgId(query)) {
            app.history.pushState(null, '/msg/'+encodeURIComponent(query))
          } else if (ssbref.isBlobId(query)) {
            app.history.pushState(null, '/webview/'+encodeURIComponent(query))            
          }
        } else {
          // text query
          query = new RegExp(query, 'i')
        }
      } else
        query = false
      this.reload({ searchQuery: query })
    }
  }

  processMsg(msg, cb) {
    // fetch thread data if not already present (using `related` as an indicator of that)
    if (this.props.threads && !('related' in msg)) {
      threadlib.getPostSummary(app.ssb, msg.key, cb)
    } else
      cb(null, msg) // noop
  }

  searchQueryFilter(thread) {
    // iterate the thread and its posts, looking for matches
    let query = this.state.searchQuery
    if (checkMatch(thread))
      return true
    // if (!thread.related)
    //   return false
    // for (var i=0; i < thread.related.length; i++) {
    //   if (checkMatch(thread.related[i]))
    //     return true
    // }
    return false

    function checkMatch (msg) {
      if (msg.value.content.type !== 'post' || (msg !== thread && !isaReplyTo(msg, thread)))
        return false
      // console.log('check match', query.test(''+msg.value.content.text), msg.value.content.text)
      return query.test(''+msg.value.content.text)
    }
  }

  // load messages from the bottom of the list
  loadMore({ amt = 50, fresh = false } = {}, done) {
    if (this.state.isLoading || this.state.isAtEnd)
      return

    var lastmsg
    let source = this.props.source || app.ssb.createFeedStream
    let cursor = this.props.cursor || ((msg) => { if (msg) { return msg.value.timestamp } })
    let updatedMsgs = (fresh) ? [] : this.state.msgs

    this.setState({ isLoading: true })
    pull(
      source({ threads: true, reverse: true, lt: cursor(this.botcursor) }),
      pull.through(msg => { lastmsg = msg }), // track last message processed
      pull.asyncMap((msg, cb) => threadlib.decryptThread(app.ssb, msg, cb)), // decrypt the message
      (this.props.filter) ? pull.filter(this.props.filter) : undefined, // run the fixed filter
      pull.asyncMap(this.processMsg.bind(this)), // fetch the thread
      (this.state.activeFilter) ? pull.filter(this.state.activeFilter.fn) : undefined, // run the user-selected filter
      pull.take(amt), // apply limit
      (this.state.searchQuery) ? pull.filter(this.searchQueryFilter.bind(this)) : undefined,
      pull.collect((err, msgs) => {
        if (err)
          console.warn('Error while fetching messages', err)

        // add msgs
        if (msgs)
          updatedMsgs = updatedMsgs.concat(msgs)

        // did we reach the end?
        var isAtEnd = false
        if (!lastmsg || (this.botcursor && this.botcursor.key == lastmsg.key))
          isAtEnd = true
        this.botcursor = lastmsg

        // update
        this.setState({ msgs: updatedMsgs, isLoading: false, isAtEnd: isAtEnd }, done)
      })
    )
  }

  // add messages to the top
  prependNewMsg(msgs) {
    var selected = this.state.selected
    msgs = Array.isArray(msgs) ? msgs : [msgs]
    msgs.forEach(msg => {
      // remove any noticeable duplicates...
      // check if the message is already in the first N and remove it if so
      for (var i=0; i < this.state.msgs.length && i < DEDUPLICATE_LIMIT; i++) {
        if (this.state.msgs[i].key === msg.key) {
          this.state.msgs.splice(i, 1)
          break
        }
      }
      // add to start of msgs
      if (selected && selected.key === msg.key)
        selected = msg // update selected, in case we replaced the current msg
      this.state.msgs.unshift(msg)
    })
    this.setState({ msgs: this.state.msgs, selected: selected })
  }

  // flush queue into the page
  prependQueuedMsgs() {
    this.prependNewMsg(this.state.newMsgQueue)
    this.setState({ newMsgQueue: [] })
  }

  render() {
    const Infinite = this.props.listItemHeight ? ReactInfinite : SimpleInfinite // use SimpleInfinite if we dont know the height of each elem
    const ListItem = this.props.ListItem || Summary
    const selectedKey = this.state.selected && this.state.selected.key
    const isEmpty = (!this.state.isLoading && this.state.msgs.length === 0)
    const append = (this.state.isAtEnd && this.props.append) ? this.props.append() : ''
    const nQueued = this.state.newMsgQueue.length
    const endOfToday = moment().endOf('day')
    var lastDate = moment().startOf('day')
    return <div className={'msg-list'+(this.state.selected?' msg-is-selected':'')}>
      <div className="msg-list-items">
        <div className="msg-list-ctrls toolbar">
          { this.props.search  ? <div className="search"><i className="fa fa-search" /><input onKeyDown={this.onSearchKeyDown.bind(this)} /></div> : '' }
          { this.props.toolbar ? this.props.toolbar() : '' }
          { this.props.filters ? <Tabs options={this.props.filters} selected={this.state.activeFilter} onSelect={this.handlers.onSelectFilter} /> : '' }
        </div>
        <Infinite
          id="msg-list-infinite"
          ref="container"
          elementHeight={this.props.listItemHeight||60}
          containerHeight={this.state.containerHeight}
          infiniteLoadBeginBottomOffset={this.state.isAtEnd ? undefined : 1200}
          onInfiniteLoad={this.onInfiniteLoad.bind(this)}
          loadingSpinnerDelegate={this.loadingElement()}
          isInfiniteLoading={this.state.isLoading} >
          { this.props.hero ? this.props.hero() : '' }
          { nQueued ?
            <a className="new-msg-queue" onClick={this.reload.bind(this)}>{nQueued} new update{u.plural(nQueued)}</a>
            : '' }
          { isEmpty ?
            <div className="empty-msg">
              { this.state.searchQuery ?
                'No results found.' :
                (this.props.emptyMsg || 'No new messages.') }
            </div>
            :
            <ReactCSSTransitionGroup component="div" transitionName="fade" transitionAppear={true} transitionAppearTimeout={500} transitionEnterTimeout={500} transitionLeaveTimeout={1}>
              { this.state.msgs.map((m, i) => {
                // render item
                const item = <ListItem
                  key={m.key}
                  msg={m}
                  {...this.handlers}
                  selected={selectedKey === m.key}
                  forceRaw={this.props.forceRaw} />

                const oldLastDate = lastDate
                const lastPost = threadlib.getLastThreadPost(m)
                lastDate = moment(lastPost.value.timestamp)
                if (this.props.dateDividers && !lastDate.isSame(oldLastDate, 'day'))
                  return <div key={m.key}><hr className="msgs-divider" data-label={lastDate.endOf('day').from(endOfToday)} />{item}</div>
                return item
              }) }
            </ReactCSSTransitionGroup>
          }
          {append}
        </Infinite>
      </div>
    </div>
  }
}
