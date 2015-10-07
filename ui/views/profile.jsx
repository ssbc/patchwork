'use babel'
import React from 'react'
import MsgList from '../com/msg-list'
import UserInfo from '../com/user-info'

export default class Profile extends React.Component {
  render() {
    var id = this.props.location.pathname.slice('/profile/'.length)

    let feed = (opts) => {
      opts = opts || {}
      opts.id = id
      return app.ssb.createUserStream(opts)
    }
    let cursor = (msg) => {
      if (msg)
        return msg.value.sequence
    }
    let filter = (msg) => {
      // toplevel post by this user
      var c = msg.value.content
      if (msg.value.author == id && c.type == 'post' && !(c.root || c.branch))
        return true
    }
    return <div className="profile" key={id}>
      <UserInfo id={id} />
      <MsgList source={feed} cursor={cursor} filter={filter} />
    </div>
  }
}