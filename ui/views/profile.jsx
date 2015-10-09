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

    // helper to refresh state and render after making changes
    let reload = () => {
      app.fetchLatestState(this.refreshState.bind(this))
    }

    this.handlers = {
      onToggleFollow: () => {
        if (this.state.isSelf) return
        // publish contact msg
        let msg = (this.state.isFollowing) ? schemas.unfollow(this.pid) : schemas.follow(this.pid)
        app.ssb.publish(msg, (err) => {
          if (err) return console.error(err) // :TODO: inform user
          reload()
        })
      },
      onRename: (name) => {
        if (name === this.state.name)
          return
        // publish about msg
        app.ssb.publish(schemas.name(this.pid, name), (err) => {
          if (err) return console.error(err) // :TODO: inform user
          reload()
        })
      },
      onFlag: (flag, reason) => {
        // prep text
        mentionslib.extract(reason, (err, mentions) => {
          if (err) {
            // :TODO: inform user
            return console.error(err)
            if (err.conflict)
              modals.error('Error While Publishing', 'You follow multiple people with the name "'+err.name+'." Go to the homepage to resolve this before publishing.')
            else
              modals.error('Error While Publishing', err, 'This error occurred while trying to extract the mentions from the text of a flag post.')
            return
          }

          // publish flag and contact msgs
          var done = multicb({ pluck: 1, spread: true })
          app.ssb.publish(schemas.block(this.pid), done())
          app.ssb.publish(schemas.flag(this.pid, flag||'other'), done())
          done((err, blockMsg, flagMsg) => {
            if (err) return console.error(err) // :TODO: inform user

            // publish a post with the reason
            if (reason.trim()) {
              app.ssb.publish(schemas.post(reason, flagMsg.key, flagMsg.key, (mentions.length) ? mentions : null), function (err) {
                if (err) return console.error(err) // :TODO: inform user
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
          if (err) return console.error(err) // :TODO: inform user
          reload()
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