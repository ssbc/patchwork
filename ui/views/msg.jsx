'use babel'
import React from 'react'
import { Thread } from '../com/msg-view'
import { verticalFilled } from '../com'
import u from '../lib/util'

var ThreadVertical = verticalFilled(Thread)

export default class Msg extends React.Component {
  constructor(props) {
    super(props)
    this.state = { thread: null, notFound: false }
  }
  componentDidMount() {
    app.ssb.relatedMessages({ id: this.props.params.id, count: true }, (err, thread) => {
      if (err || !thread)
        return console.warn(err), this.setState({ notFound: true })
      u.decryptThread(thread, () => { this.setState({ thread: thread }) })
    })
  }
  render() {
    return <div className="msg">
      {this.state.notFound ? <h1>Not found <small>{this.props.params.id}</small></h1> : ''}
      {this.state.thread ? <ThreadVertical thread={this.state.thread} /> : ''}
    </div>
  }
}