'use babel'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import multicb from 'multicb'
import MsgList from '../com/msg-list'
import UserInfo from '../com/user-info'
import app from '../lib/app'
import social from '../lib/social-graph'
import mentionslib from '../lib/mentions'
import u from '../lib/util'

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
      return <UserInfo key={this.state.pid} pid={this.state.pid} />
    }
    return <div id="profile" key={this.state.pid}>
      <MsgList threads live={{ gt: Date.now() }} source={feed} cursor={cursor} filter={filter} defaultView={defaultView} />
    </div>
  }
}