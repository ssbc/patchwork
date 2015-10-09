'use babel'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import MsgList from '../com/msg-list'
import UserInfo from '../com/user-info'
import app from '../lib/app'
import social from '../lib/social-graph'
import u from '../lib/util'

export default class Profile extends React.Component {
  constructor(props) {
    super(props)
    this.pid = decodeURIComponent(this.props.params.id)
    this.state = this.getState()

    this.handlers = {
      onToggleFollow: () => {
        if (this.state.isSelf) return
        let msg = (this.state.isFollowing) ? schemas.unfollow(this.pid) : schemas.follow(this.pid)
        app.ssb.publish(msg, (err) => {
          if (err)
            return console.error(err) // :TODO: inform user

          // update state and trigger render
          app.fetchLatestState(this.refreshState.bind(this))
        })
      },
      onRename: (name) => {
        if (name === this.state.name)
          return
        app.ssb.publish(schemas.name(this.pid, name), (err) => {
          if (err) 
            return console.error(err) // :TODO: inform user

          // update state and trigger render
          app.fetchLatestState(this.refreshState.bind(this))
        })
      }
    }
  }

  componentWillReceiveProps(newProps) {
    this.pid = decodeURIComponent(newProps.params.id)
    this.refreshState()
  }

  getState() {
    return {
      profile:     app.users.profiles[this.pid],
      name:        app.users.names[this.pid] || u.shortString(this.pid, 6),
      isSelf:      (this.pid == app.user.id),
      isFollowing: social.follows(app.user.id, this.pid),
      followsYou:  social.follows(this.pid, app.user.id),
      hasFlagged:  social.flags(app.user.id, this.pid),
      hasBlocked:  social.blocks(app.user.id, this.pid),
      followers1:  social.followedFollowers(app.user.id, this.pid, true),
      followers2:  social.unfollowedFollowers(app.user.id, this.pid),
      followeds:   social.followeds(this.pid),
      flaggers:    social.followedFlaggers(app.user.id, this.pid, true)
    }
  }
  refreshState() {
    this.setState(this.getState())
  }

  render() {
    let feed = (opts) => {
      opts = opts || {}
      opts.id = this.pid
      return app.ssb.createUserStream(opts)
    }
    let cursor = (msg) => {
      if (msg)
        return msg.value.sequence
    }
    let filter = (msg) => {
      // toplevel post by this user
      var c = msg.value.content
      if (msg.value.author == this.pid && c.type == 'post' && !(c.root || c.branch))
        return true
    }
    return <div className="profile" key={this.pid}>
      <UserInfo pid={this.pid} {...this.state} {...this.handlers} />
      <MsgList threads live={{ gt: Date.now() }} source={feed} cursor={cursor} filter={filter} />
    </div>
  }
}