'use babel'
import pull from 'pull-stream'
import React from 'react'
import Infinite from 'react-infinite'
import Summary from './summary'
import { Thread } from '../msg-view'
import { verticalFilled } from '../'
import app from '../../lib/app'
import u from '../../lib/util'

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
  }

  componentDidMount() {
    // load first messages
    this.loadMore()

    // setup autoresizing
    this.calcContainerHeight()
    this.resizeListener = this.calcContainerHeight.bind(this)
    window.addEventListener('resize', this.resizeListener)

    // setup livestream
    if (this.props.live) {
      let source = this.props.source || app.ssb.createFeedStream
      let opts = (typeof this.props.live == 'object') ? this.props.live : {}
      opts.live = true
      this.liveStream = source(opts)
      pull(
        this.liveStream,
        (this.props.filter) ? pull.filter(this.props.filter) : undefined,
        pull.paraMap(this.decryptMsg.bind(this)),
        pull.drain((msg) => {
          // remove any noticeable duplicates...
          // check if the message is already in the first 100 and remove it if so
          for (var i=0; i < this.state.msgs.length && i < 100; i++) {
            if (this.state.msgs[i].key === msg.key) {
              this.state.msgs.splice(i, 1)
              i--
            }
          }
          // add to start of msgs
          this.state.msgs.unshift(msg)
          this.setState({ msgs: this.state.msgs })
        })
      )
    }
  }
  componentWillUnmount() {
    // stop autoresizing
    window.removeEventListener('resize', this.resizeListener)
    // abort livestream
    if (this.liveStream)
      this.liveStream(true, function(){})
  }

  loadingElement() {
    return <div className="msg-list-item summary">
      Loading...
    </div>
  }

  calcContainerHeight() {
    var height = window.innerHeight
    if (this.refs && this.refs.container) {
      var rect = this.refs.container.getDOMNode().getClientRects()[0]
      height = window.innerHeight - rect.top
    }
    this.setState({ containerHeight: height })
  }

  decryptMsg(msg, cb) {
    // fetch thread data and decrypt
    if (this.props.threads) {
      app.ssb.relatedMessages({ id: msg.key, count: true }, (err, thread) => {
        if (err || !thread)
          return console.warn(err), cb(null, msg) // shouldnt happen
        u.decryptThread(thread, () => { cb(null, thread) })
      })
    } else
      u.decryptThread(msg, () => { cb(null, msg) })
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
        (this.props.filter) ? pull.filter(this.props.filter) : undefined,
        pull.paraMap(this.decryptMsg.bind(this)),
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
    fetchBottomBy(amt, (isAtEnd) => {
      this.setState({
        isLoading: false,
        isAtEnd: isAtEnd,
        msgs: updatedMsgs,
        selected: this.state.selected || updatedMsgs[0]
      })
    })
  }

  onSelectMsg(msg) {
    this.setState({ selected: msg })
  }

  render() {
    return <div ref="container" className="msg-list">
      <Infinite className="msg-list-items"
        elementHeight={60}
        containerHeight={this.state.containerHeight}
        infiniteLoadBeginBottomOffset={1200}
        onInfiniteLoad={this.loadMore.bind(this)}
        loadingSpinnerDelegate={this.loadingElement()}
        isInfiniteLoading={this.state.isLoading} >
        {this.state.msgs.map((m, i) => {
          return <Summary key={i} msg={m} onSelect={this.onSelectMsg.bind(this)} selected={this.state.selected === m} forceRaw={this.props.forceRaw} />
        })}
      </Infinite>
      <div className="msg-list-view">
        {this.state.selected ? <ThreadVertical thread={this.state.selected} forceRaw={this.props.forceRaw} /> : ''}
      </div>
    </div>
  }
}