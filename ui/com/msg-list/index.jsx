'use babel'
import pull from 'pull-stream'
import React from 'react'
import Infinite from 'react-infinite'
import Summary from './summary'
import MsgView from '../msg-view'
import app from '../../lib/app'

export default class MsgList extends React.Component {
  constructor(props) {
    super(props)
    this.botcursor = null
    this.state = {
      msgs: [],
      selected: null,
      isLoading: false
    }
  }

  componentDidMount() {
    this.loadMore()
  }

  loadingElement() {
    return <div className="msg-list-item summary">
      Loading...
    </div>
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
    return <div className="msg-list">
      <Infinite className="msg-list-items"
        elementHeight={60}
        containerHeight={450}
        infiniteLoadBeginBottomOffset={200}
        onInfiniteLoad={this.loadMore.bind(this)}
        loadingSpinnerDelegate={this.loadingElement()}
        isInfiniteLoading={this.state.isLoading} >
        {this.state.msgs.map((m, i) => {
          return <Summary key={i} msg={m} onSelect={this.onSelectMsg.bind(this)} selected={this.state.selected === m} />
        })}
      </Infinite>
      <div className="msg-list-view">
        {this.state.selected ? <MsgView msg={this.state.selected} /> : undefined}
      </div>
    </div>
  }
}