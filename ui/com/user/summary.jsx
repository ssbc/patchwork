'use babel'
import React from 'react'
import { Link } from 'react-router'
import { AutoRefreshingComponent, UserPic } from '../index'
import app from '../../lib/app'
import u from '../../lib/util'
import social from '../../lib/social-graph'

export default class UserSummary extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props.pid
    return {
      profile:    app.users.profiles[pid],
      name:       app.users.names[pid] || u.shortString(pid, 6),
      isUser:     app.user.id === pid,
      following:  social.follows(app.user.id, pid),
      follower:   social.follows(pid, app.user.id),
      flagged:    social.flags(app.user.id, pid)
    }
  }

  onClick() {
    app.history.pushState(null, '/profile/'+encodeURIComponent(this.props.pid))
  }

  render() {
    return <div className="user-summary" onClick={this.onClick.bind(this)}>
      <UserPic id={this.props.pid} />
      <div className="name">{this.state.name}</div>
    </div>
  }
}