'use babel'
import React from 'react'
import Thread from '../com/msg-thread'
import mlib from 'ssb-msgs'
import app from '../lib/app'
import u from '../lib/util'

export default class Msg extends React.Component {
  constructor(props) {
    super(props)
    this.state = { thread: null }
  }
  componentDidMount() {
    this.load(this.props.params.id)
  }
  componentWillReceiveProps(newProps) {
    this.load(newProps.params.id)
  }
  load(id) {
    if (!id)
      return
    u.getPostThread(id, (err, thread) => {
      if (err)
        return app.issue('Failed to Load Message', err, 'This happened in msg-list componentDidMount')
      this.setState({ thread: thread })
    })
  }
  render() {
    return <div id="msg">
      { this.state.thread ? <Thread thread={this.state.thread} /> : '' }
    </div>
  }
}