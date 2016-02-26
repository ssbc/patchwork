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
      following:  social.follows(app.user.id, pid),
      follower:   social.follows(pid, app.user.id)
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
      <div className="user-name">
        <div>{ this.state.name }</div>
        { this.props['follow-btn'] && this.props.pid !== app.user.id
          ? (this.state.following
            ? <a className="btn follow-btn unfollow" onClick={this.onToggleFollow.bind(this)}>
                <HoverShifter>
                  <span><i className="fa fa-check" /> { this.state.follower ? 'Friend' : 'Following' }</span>
                  <span><i className="fa fa-times" /> Unfollow</span>
                </HoverShifter>
              </a>
            : <a className="btn follow-btn" onClick={this.onToggleFollow.bind(this)}>
                <HoverShifter>
                  <span><i className="fa fa-plus" /> Follow</span>
                  <span><i className="fa fa-plus" /> Follow</span>
                </HoverShifter>
              </a>)
          : ''
        }
      </div>
    </div>
  }
}

export class UserSummaries extends React.Component {
  render() {
    var groups = u.chunk(this.props.ids, 3)

    // if the last row is short, add empty items
    var l =groups.length
    while (l > 0 && groups[l - 1].length < 3)
      groups[l - 1].push({ placeholder: true })

    return <div className="user-summaries">
      { groups.map(ids => {
        return <div className="user-summaries-row">{ ids.map(id => {
          if (id.addContactBtn)
            return <a className="user-add hint--bottom" data-hint="Add Friends" href='#/add-contact'><i className="fa fa-user-plus" /></a>
          if (id.joinPubBtn)
            return <a className="user-add hint--bottom" data-hint="Join a Pub" onClick={this.props.onClickJoinPub}><i className="fa fa-laptop" /></a>
          if (id.placeholder)
            return <div className="user-summary placeholder" />
          return <UserSummary key={id} pid={id} follow-btn />
        }) }</div>
      }) }
    </div>
  }
}