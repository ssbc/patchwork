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
    this.pid = decodeURIComponent(this.props.params.id)
    this.state = this.getState()

    // helpers to refresh state and render after making changes
    this.refreshState = () => this.setState(this.getState())
    let reload = () => { app.fetchLatestState(this.refreshState) }

    this.handlers = {
      onToggleFollow: () => {
        if (this.state.isSelf) return
        // publish contact msg
        let msg = (this.state.isFollowing) ? schemas.unfollow(this.pid) : schemas.follow(this.pid)
        app.ssb.publish(msg, (err) => {
          if (err) return app.issue('Failed to publish contact msg', err, 'Profile view onToggleFollow')
          reload()
        })
      },
      onRename: (name) => {
        if (name === this.state.name)
          return
        // publish about msg
        app.ssb.publish(schemas.name(this.pid, name), (err) => {
          if (err) return app.issue('Failed to publish about msg', err, 'Profile view onRename')
          reload()
        })
      },
      onFlag: (flag, reason) => {
        // prep text
        mentionslib.extract(reason, (err, mentions) => {
          if (err) {
            if (err.conflict)
              app.issue('Error While Publishing', 'You follow multiple people with the name "'+err.name+'." Go to the homepage to resolve this before publishing.')
            else
              app.issue('Error While Publishing', err, 'This error occurred while trying to extract the mentions from the text of a flag post.')
            return
          }

          // publish flag and contact msgs
          var done = multicb({ pluck: 1, spread: true })
          app.ssb.publish(schemas.block(this.pid), done())
          app.ssb.publish(schemas.flag(this.pid, flag||'other'), done())
          done((err, blockMsg, flagMsg) => {
            if (err) return app.issue('Failed to publish flag msgs', err, 'Profile view onFlag')

            // publish a post with the reason
            if (reason.trim()) {
              app.ssb.publish(schemas.post(reason, flagMsg.key, flagMsg.key, (mentions.length) ? mentions : null), function (err) {
                if (err) return app.issue('Failed to publish flag reason msg', err, 'Profile view onFlag')
                reload()
              })
            } else
              reload()
          })
        })
      },
      onUnflag: () => {
        var done = multicb()
        app.ssb.publish(schemas.unblock(this.pid), done())
        app.ssb.publish(schemas.unflag(this.pid), done())
        done((err) => {
          if (err) return app.issue('Failed to publish unflag msgs', err, 'Profile view onUnflag')
          reload()
        })
      }
    }
  }

  componentWillReceiveProps(newProps) {
    this.pid = decodeURIComponent(newProps.params.id)
    this.refreshState()
  }
  componentDidMount() {
    app.on('update:all', this.refreshState)
  }
  componentWillUnmount() {
    app.removeListener('update:all', this.refreshState)    
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
    let defaultView = () => {
      return <UserInfo pid={this.pid} {...this.state} {...this.handlers} />
    }
    return <div id="profile" key={this.pid}>
      <MsgList threads live={{ gt: Date.now() }} source={feed} cursor={cursor} filter={filter} defaultView={defaultView} />
    </div>
  }
}