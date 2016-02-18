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
    this.refresh = () => { this.setState(this.buildState()) }
    app.on('update:all', this.refresh)
    app.on('update:indexCounts', this.refresh)
    app.on('update:isWifiMode', this.refresh)
  }
  componentWillUnmount() {
    app.removeListener('update:all', this.refresh)
    app.removeListener('update:indexCounts', this.refresh)
    app.removeListener('update:isWifiMode', this.refresh)
  }
  buildState() {
    // copy over app state
    return {
      isWifiMode: app.isWifiMode,
      indexCounts: app.indexCounts||{}
    }
  }

  static Heading (props) {
    return <div className="heading">{props.children}</div>
  }
  static Link (props) {
    return <div className={'link '+(props.className||'')+(props.pathname === props.to ? ' selected' : '')}>
      <Link to={props.to}>{props.children}</Link>
    </div>
  }
  static IconLink(props) {
    const cls = classNames(props.className||'', 'ctrl flex-fill', props.hint ? ('hint--'+props.hint) : '')
    const count = props.count ? <div className="count">{props.count}</div> : ''
    return <Link className={cls} to={props.to} data-hint={props.title}>
      <i className={'fa fa-'+props.icon} />
      <span className="label">{props.label}</span> {count}
    </Link>    
  }

  render() {
    const pathname = this.props.location && this.props.location.pathname
    const isWifiMode = this.state.isWifiMode

    const contacts = app.user.friends.map(id => ({ id: id, name: u.getName(id) })).sort((a, b) => a.name.localeCompare(b.name))
    const renderContact = c => <RightNav.Link pathname={pathname} key={c.id} to={'/profile/'+encodeURIComponent(c.id)}>{c.name} <i className="fa fa-user" /></RightNav.Link>

    return <div className="rightnav">
      <div className="toolbar flex">
        <RightNav.IconLink to="/digs" icon="hand-peace-o" count={app.indexCounts.digsUnread} title="Digs on your posts" hint="bottom" />
        <RightNav.IconLink to="/sync" icon="cloud-download" title="Network sync status" hint="bottom" />
        {''/*<RightNav.IconLink to="/data" icon="database" title="Raw database feed" hint="bottom-left" />*/}
        <Link className="ctrl flex-fill hint--bottom-left user-pic" data-hint="Your Profile" to={`/profile/${encodeURIComponent(app.user.id)}`}><img src={u.profilePicUrl(app.user.id)} /></Link>
      </div>
      {this.props.children}
      <RightNav.Heading>Your Contacts</RightNav.Heading>
      <RightNav.Link pathname={pathname} to="/contacts">View All <i className="fa fa-users" /></RightNav.Link>
      { contacts.map(renderContact) }
      <div className="link"><Link to="/add-contact">Find more...</Link></div>
    </div>
  }
}