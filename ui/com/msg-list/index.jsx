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
      containerHeight: window.innerHeight
    }
  }

  componentDidMount() {
    this.loadMore()
    this.calcContainerHeight()
    this.resizeListener = this.calcContainerHeight.bind(this)
    window.addEventListener('resize', this.resizeListener)
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.resizeListener)
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

  loadMore(amt) {
    if (this.state.isLoading)
      return

    let numFetched = 0
    let source = this.props.source || app.ssb.createFeedStream
    let cursor = this.props.cursor || ((msg) => { if (msg) { return msg.value.timestamp } })
    let updatedMsgs = this.state.msgs

    let fetchBottomBy = (amt, cb) => {
      amt = amt || 30
      var lastmsg
      pull(
        source({ reverse: true, limit: amt, lt: cursor(this.botcursor) }),
        pull.through(msg => { lastmsg = msg }), // track last message processed
        (this.props.filter) ? pull.filter(this.props.filter) : undefined,
        pull.paraMap(function (msg, cb) {
          // fetch thread data
          app.ssb.relatedMessages({ id: msg.key, count: true }, (err, thread) => {
            if (err || !thread)
              return console.warn(err), cb(null, msg) // shouldnt happen
            u.decryptThread(thread, () => { cb(null, thread) })
          })
        }),
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
            return cb()
          this.botcursor = lastmsg

          // fetch more if needed
          var remaining = amt - msgs.length
          if (remaining > 0)
            return fetchBottomBy(remaining, cb)

          // we're done
          cb()
        })
      )
    }

    this.setState({ isLoading: true })
    fetchBottomBy(amt, () => {
      this.setState({
        isLoading: false,
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
        infiniteLoadBeginBottomOffset={200}
        onInfiniteLoad={this.loadMore.bind(this)}
        loadingSpinnerDelegate={this.loadingElement()}
        isInfiniteLoading={this.state.isLoading} >
        {this.state.msgs.map((m, i) => {
          return <Summary key={i} msg={m} onSelect={this.onSelectMsg.bind(this)} selected={this.state.selected === m} />
        })}
      </Infinite>
      <div className="msg-list-view">
        {this.state.selected ? <ThreadVertical thread={this.state.selected} /> : undefined}
      </div>
    </div>
  }
}