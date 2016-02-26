'use babel'
import React from 'react'
import { Link } from 'react-router'
import schemas from 'ssb-msg-schemas'
import { AutoRefreshingComponent, UserPic, HoverShifter } from '../index'
import app from '../../lib/app'
import u from '../../lib/util'
import social from '../../lib/social-graph'

export default class UserSummary extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props.pid
    return {
      name:       app.users.names[pid] || u.shortString(pid, 6),
      following:  social.follows(app.user.id, pid)
    }
  }

  onClick() {
    app.history.pushState(null, '/profile/'+encodeURIComponent(this.props.pid))
  }

  onToggleFollow(e) {
    e.preventDefault()
    e.stopPropagation()
    // publish contact msg
    let msg = (this.state.following) ? schemas.unfollow(this.props.pid) : schemas.follow(this.props.pid)
    app.ssb.publish(msg, (err) => {
      if (err) return app.issue('Failed to publish contact msg', err, 'Profile view onToggleFollow')
      app.fetchLatestState()
    })
  }

  render() {
    return <div className="user-summary" onClick={this.onClick.bind(this)}>
      <UserPic id={this.props.pid} />
      <div className="name">{this.state.name}</div>
      { this.props['follow-btn']
        ? (this.state.following
          ? <a className="btn follow-btn highlighted" onClick={this.onToggleFollow.bind(this)}>
              <HoverShifter>
                <span><i className="fa fa-check" /> Following</span>
                <span><i className="fa fa-times" /> Unfollow</span>
              </HoverShifter>
            </a>
          : <a className="btn follow-btn highlighted" onClick={this.onToggleFollow.bind(this)}><i className="fa fa-plus" /> Follow</a>)
        : ''
      }
    </div>
  }
}