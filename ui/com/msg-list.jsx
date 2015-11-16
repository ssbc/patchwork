'use babel'
import pull from 'pull-stream'
import React from 'react'
import ReactDOM from 'react-dom'
import schemas from 'ssb-msg-schemas'
import mlib from 'ssb-msgs'
import ReactInfinite from 'react-infinite'
import SimpleInfinite from './simple-infinite'
import Summary from './msg-view/summary'
import Tabs from './tabs'
import { VerticalFilledContainer, verticalFilled } from './index'
import { isaReplyTo } from '../lib/msg-relation'
import app from '../lib/app'
import u from '../lib/util'

// how many messages to fetch in a batch?
const BATCH_LOAD_AMT = 30

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
      onSelect: msg => {
        window.location.hash = '#/msg/' + encodeURIComponent(msg.key)
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
      },
      onSearchKeydown: (e) => {
        // enter pressed?
        if (e.keyCode !== 13)
          return

        // set the query and reload messages
        let query = this.refs.searchInput.value
        if (query.trim())
          query = new RegExp(query.trim(), 'i')
        else
          query = false
        this.setState({ searchQuery: query, msgs: [], isAtEnd: false }, () => {
          this.botcursor = null
          this.loadMore(30)
        })
      }
    }
  }

  componentDidMount() {
    // load first messages
    this.loadMore(BATCH_LOAD_AMT)

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

  reload() {
    this.setState({ msgs: [], isAtEnd: false }, () => {
      this.botcursor = null
      this.loadMore(BATCH_LOAD_AMT)
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
    opts.live = true
    this.liveStream = source(opts)
    pull(
      this.liveStream,
      pull.asyncMap((msg, cb) => u.decryptThread(msg, cb)), // decrypt the message
      (this.props.filter) ? pull.filter(this.props.filter) : undefined, // run the fixed filter
      pull.asyncMap(this.processMsg.bind(this)), // fetch the thread
      (this.state.activeFilter) ? pull.filter(this.state.activeFilter.fn) : undefined, // run the user-selected filter
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
      var rect = ReactDOM.findDOMNode(this.refs.container).getClientRects()[0]
      if (!rect)
        return
      height = window.innerHeight - rect.top
    }
    this.setState({ containerHeight: height })
  }

  processMsg(msg, cb) {
    // fetch thread data
    if (this.props.threads) {
      u.getPostSummary(msg.key, cb)
    } else
      cb(null, msg) // noop
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

  loadMore(amt, done) {
    amt = amt || 50
    if (this.state.isLoading || this.state.isAtEnd)
      return

    var lastmsg
    let source = this.props.source || app.ssb.createFeedStream
    let cursor = this.props.cursor || ((msg) => { if (msg) { return msg.value.timestamp } })
    let updatedMsgs = this.state.msgs

    var start = Date.now()
    this.setState({ isLoading: true })
    pull(
      source({ reverse: true, lt: cursor(this.botcursor) }),
      pull.through(msg => { lastmsg = msg }), // track last message processed
      pull.paraMap((msg, cb) => u.decryptThread(msg, cb), amt), // decrypt the message
      (this.props.filter) ? pull.filter(this.props.filter) : undefined, // run the fixed filter
      pull.paraMap(this.processMsg.bind(this), amt), // fetch the thread
      (this.state.activeFilter) ? pull.filter(this.state.activeFilter.fn) : undefined, // run the user-selected filter
      pull.take(amt), // apply limit
      // :TODO: restore search
      // (this.state.searchQuery) ? pull.filter(this.searchQueryFilter.bind(this)) : undefined,
      pull.collect((err, msgs) => {
        if (err)
          console.warn('Error while fetching messages', err)
        console.log(Date.now() - start)

        // add to messages
        if (msgs.length)
          updatedMsgs = updatedMsgs.concat(msgs)

        // did we reach the end?
        var isAtEnd = false
        if (!lastmsg || (this.botcursor && this.botcursor.key == lastmsg.key))
          isAtEnd = true
        this.botcursor = lastmsg

        this.setState({
          isLoading: false,
          isAtEnd: isAtEnd,
          msgs: updatedMsgs
        }, done)
      })
    )
  }

  render() {
    const Infinite = this.props.listItemHeight ? ReactInfinite : SimpleInfinite // use SimpleInfinite if we dont know the height of each elem
    const ListItem = this.props.ListItem || Summary
    const selectedKey = this.state.selected && this.state.selected.key
    const isEmpty = (!this.state.isLoading && this.state.msgs.length === 0)
    const append = (this.state.isAtEnd && this.props.append) ? this.props.append() : ''
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
          { this.props.hero ? this.props.hero() : '' }
          <div className={'msg-list-ctrls toolbar'+(this.props.floatingToolbar?' floating':'')}>
            { this.props.toolbar ? this.props.toolbar() : '' }
            { this.props.filters ? <Tabs options={this.props.filters} selected={this.state.activeFilter} onSelect={this.handlers.onSelectFilter} /> : '' }
          </div>
          { isEmpty ?
            <div className="empty-msg">
              { this.state.searchQuery ?
                'No results found.' :
                (this.props.emptyMsg || 'No new messages.') }
            </div>
            :
            <div>
              { this.state.msgs.map((m, i) => {
                return <ListItem key={m.key} msg={m} {...this.handlers} selected={selectedKey === m.key} forceRaw={this.props.forceRaw} />
              }) }
            </div>
          }
          {append}
        </Infinite>
      </div>
    </div>
  }
}
