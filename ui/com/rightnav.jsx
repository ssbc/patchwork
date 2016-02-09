'use babel'
import React from 'react'
import { Link } from 'react-router'
import classNames from 'classnames'
import { UserPic } from './index'
import u from '../lib/util'
import app from '../lib/app'

export default class RightNav extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.buildState()

    // listen for app change-events that should update our state
    const refresh = () => { this.setState(this.buildState()) }
    app.on('update:all', refresh)
    app.on('update:indexCounts', refresh)
    app.on('update:isWifiMode', refresh)
  }
  buildState() {
    // copy over app state
    return {
      isWifiMode: app.isWifiMode,
      indexCounts: app.indexCounts||{}
    }
  }

  render() {
    const isWifiMode = this.state.isWifiMode

    const NavLink = (props) => {
      const cls = classNames(props.className||'', 'ctrl flex-fill', props.hint ? ('hint--'+props.hint) : '')
      const count = props.count ? <div className="count">{props.count}</div> : ''
      return <Link className={cls} to={props.to} data-hint={props.title}>
        <i className={'fa fa-'+props.icon} />
        <span className="label">{props.label}</span> {count}
      </Link>
    }

    return <div className="rightnav">
      <div className="toolbar flex">
        <NavLink to="/digs" icon="hand-peace-o" count={app.indexCounts.digsUnread} title="Digs on your posts" hint="bottom" />
        <NavLink to="/sync" icon="cloud-download" title="Network sync status" hint="bottom" />
        {''/*<NavLink to="/data" icon="database" title="Raw database feed" hint="bottom-left" />*/}
        <Link className="ctrl flex-fill hint--bottom-left user-pic" data-hint="Your Profile" to={`/profile/${encodeURIComponent(app.user.id)}`}><img src={u.profilePicUrl(app.user.id)} /></Link>
      </div>
      {this.props.children}
    </div>
  }
}