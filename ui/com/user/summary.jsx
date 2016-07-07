'use babel'
import React from 'react'
import { Link } from 'react-router'
import schemas from 'ssb-msg-schemas'
import ip from 'ip'
import { AutoRefreshingComponent } from '../index'
import { UserPic } from 'patchkit-links'
import HoverShifter from 'patchkit-hover-shifter'
import u from 'patchkit-util'
import social from 'patchkit-util/social'
import app from '../../lib/app'
import t from 'patchwork-translations'

export default class UserSummary extends AutoRefreshingComponent {
  computeState(props) {
    const pid = props.pid
    return {
      name:       app.users.names[pid] || u.shortString(pid, 6),
      following:  social.follows(app.users, app.user.id, pid),
      follower:   social.follows(app.users, pid, app.user.id),
      isPub:      isPub(pid)
    }
  }

  onClick() {
    app.history.pushState(null, '/profile/'+encodeURIComponent(this.props.pid))
  }

  onToggleFollow(e) {
    e.preventDefault()
    e.stopPropagation()
    // publish contact msg
    const willBeFollowing = !this.state.following
    const msg = willBeFollowing ? schemas.follow(this.props.pid) : schemas.unfollow(this.props.pid)
    app.ssb.publish(msg, (err) => {
      if (err) return app.issue(t('error.publishContact'), err, 'Profile view onToggleFollow')
      app.fetchLatestState()
      app.notice(t(willBeFollowing ? 'NowFollowing' : 'NoLongerFollowing', this.state))
    })
  }

  render() {
    return <div className="user-summary" onClick={this.onClick.bind(this)}>
      <UserPic id={this.props.pid} />
      <div className="user-name">
        <div>{ this.state.name }{ this.state.isPub ? <small> {t('pub')}</small> : '' }</div>
        { this.props['follow-btn'] && this.props.pid !== app.user.id
          ? (this.state.following
            ? <a className="btn follow-btn unfollow" onClick={this.onToggleFollow.bind(this)}>
                <HoverShifter>
                  <span><i className="fa fa-check" /> { t(this.state.follower ? 'Friend' : 'Following') }</span>
                  <span><i className="fa fa-times" /> {t('Unfollow')}</span>
                </HoverShifter>
              </a>
            : <a className="btn follow-btn" onClick={this.onToggleFollow.bind(this)}>
                <HoverShifter>
                  <span><i className="fa fa-plus" /> {t('Follow')}</span>
                  <span><i className="fa fa-plus" /> {t('Follow')}</span>
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
    var groups = chunk(this.props.ids, 3)

    // if the last row is short, add empty items
    var l =groups.length
    while (l > 0 && groups[l - 1].length < 3)
      groups[l - 1].push({ placeholder: true })

    return <div className="user-summaries">
      { groups.map(ids => {
        return <div className="user-summaries-row">{ ids.map(id => {
          if (id.addContactBtn)
            return <a className="user-add hint--bottom" data-hint={t('AddFriends')} href='#/add-contact'><i className="fa fa-user-plus" /></a>
          if (id.joinPubBtn)
            return <a className="user-add hint--bottom" data-hint={t('JoinAPub')} onClick={this.props.onClickJoinPub}><i className="fa fa-laptop" /></a>
          if (id.placeholder)
            return <div className="user-summary placeholder" />
          return <UserSummary key={id} pid={id} follow-btn />
        }) }</div>
      }) }
    </div>
  }
}

function chunk (arr, size) {
  var arrs = [], i=0, s=0
  while (i < arr.length) {
    arrs.push(arr.slice(i, i+size))
    i += size
  }
  return arrs
}

// is `id` a pub?
function isPub (id) {
  // try to find the ID in the peerlist, and see if it's a public peer if so
  for (var i=0; i < app.peers.length; i++) {
    var peer = app.peers[i]
    if (peer.key === id && !ip.isPrivate(peer.host))
      return true
  }
  return false
}