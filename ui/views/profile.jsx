'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import { VerticalFilledContainer } from '../com/index'
import UserInfo from '../com/user-info'
import app from '../lib/app'

export default class Profile extends React.Component {
  constructor(props) {
    super(props)
    this.state = { pid: decodeURIComponent(this.props.params.id) }
  }

  componentWillReceiveProps(newProps) {
    this.setState({ pid: decodeURIComponent(newProps.params.id) })
  }

  render() {
    let feed = (opts) => {
      opts = opts || {}
      opts.id = this.state.pid
      return app.ssb.createUserStream(opts)
    }
    let cursor = (msg) => {
      if (msg)
        return msg.value.sequence
    }
    let filter = (msg) => {
      // toplevel post by this user
      var c = msg.value.content
      if (msg.value.author == this.state.pid && c.type == 'post' && !(c.root || c.branch))
        return true
    }
    let defaultView = () => {
      return <VerticalFilledContainer><UserInfo key={this.state.pid} pid={this.state.pid} /></VerticalFilledContainer>
    }
    // MsgList must have refreshOnReply
    // - Why: in other views, such as the inbox view, a reply will trigger a new message to be emitted in the livestream
    // - that's not the case for `createUserStream`, so we need to manually refresh a thread on reply
    return <div id="profile" key={this.state.pid}>
      <MsgList threads source={feed} cursor={cursor} filter={filter} defaultView={defaultView} refreshOnReply />
    </div>
  }
}