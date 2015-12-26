'use babel'
import React from 'react'
import { Link } from 'react-router'
import ssbref from 'ssb-ref'
import app from './lib/app'
import Notifications from './com/msg-list/notifications'
import Bookmarks from './com/msg-list/bookmarks'
import ModalFlow from './com/modals/flow'
import Welcome from './com/forms/welcome'
import ProfileSetup from './com/forms/profile-setup'
import FollowNearby from './com/forms/follow-nearby'
import Friends from './com/forms/friends'
import Issues from './com/issues'
import FindBar from './com/findbar'

const SETUP_LABELS = [
  <span><i className="fa fa-power-off"/><br/><small>Welcome</small></span>,
  <span><i className="fa fa-pencil"/><br/><small>Nickname</small></span>,
  <span><i className="fa fa-photo"/><br/><small>Photo</small></span>,
  <span><i className="fa fa-check-square"/><br/><small>Start</small></span>
]
const SETUP_FORMS = [Welcome, ProfileSetup, FollowNearby, Friends]
const RIGHT_NAVS = {
  notifications: Notifications,
  bookmarks: Bookmarks
}

export default class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.buildState()

    // listen for app change-events that should update our state
    const refresh = () => { this.setState(this.buildState()) }
    app.on('update:all', refresh)
    app.on('update:indexCounts', refresh)
    app.on('update:isWifiMode', refresh)
    app.on('focus:search', this.focusSearch.bind(this))
    app.on('focus:find', this.focusFind.bind(this))
    app.on('toggle:rightnav', this.toggleRightNav.bind(this))
    app.on('modal:setup', isOpen => this.setState({ setupIsOpen: isOpen }))
    app.on('find:next', this.doFind.bind(this, true))
    app.on('find:previous', this.doFind.bind(this, false))
  }
  componentWillReceiveProps() {
    // update state on view changes
    app.fetchLatestState()
  }
  buildState() {
    // copy over app state
    return {
      rightNav: (this.state) ? this.state.rightNav : false,
      rightNavProps: (this.state) ? this.state.rightNavProps : {},
      isWifiMode: app.isWifiMode,
      indexCounts: app.indexCounts||{},
      user: app.user,
      users: app.users,
      setupIsOpen: app.user.needsSetup,
      setupCantClose: app.user.needsSetup,
      isComposerOpen: app.isComposerOpen
    }
  }

  toggleRightNav(id) {
    if (this.state.rightNav == id)
      this.setState({ rightNav: false, rightNavProps: {} })
    else
      this.setState({ rightNav: id })
  }

  focusSearch() {
     this.refs.search.focus()
  }

  focusFind() {
    this.refs.find.focus()
  }

  doFind(forward) {
    this.refs.find.search(forward)
  }

  onClickBack() {
    window.history.back()
  }

  onSearchKeyDown(e) {
    if (e.keyCode == 13) { // on enter
      var query = e.target.value
      if (query && query.trim()) {
        if (ssbref.isLink(query)) {
          // a link, lookup
          if (ssbref.isFeedId(query)) {
            app.history.pushState(null, '/profile/'+encodeURIComponent(query))
          } else if (ssbref.isMsgId(query)) {
            app.history.pushState(null, '/msg/'+encodeURIComponent(query))
          } else if (ssbref.isBlobId(query)) {
            app.history.pushState(null, '/webview/'+encodeURIComponent(query))            
          }
        } else {
          // text query
          app.history.pushState(null, '/search/'+encodeURIComponent(query))
        }
      }
    }
  }

  render() {
    const location = this.props.location.pathname
    const isWifiMode = this.state.isWifiMode
    const onToggleRightNav = (id) => () => { this.toggleRightNav(id) }
    const RightNavView = (this.state.rightNav) ? RIGHT_NAVS[this.state.rightNav] : null

    const NavLink = (props) => {
      const selected = props.selected || (props.to === location)
      const cls = 'ctrl '+(selected?'selected':'')
      const count = props.count ? <div className="count">{props.count}</div> : ''
      return <Link className={cls} to={props.to}><i className={'fa fa-'+props.icon} /><span className="label">{props.label}</span> {count}</Link>
    }
    const NavToggle = (props) => {
      const selected = (props.to === this.state.rightNav)
      const cls = 'ctrl '+(selected?'selected':'')
      const count = props.count ? <div className="count">{props.count}</div> : ''
      return <a className={cls} onClick={onToggleRightNav(props.to)}><i className={'fa fa-'+props.icon} /> {count}</a>
    }

    return <div className="layout-rows">
      <ModalFlow className="fullheight" labels={SETUP_LABELS} Forms={SETUP_FORMS} isOpen={this.state.setupIsOpen} cantClose={this.state.setupCantClose} />
      <div className="toolbar titlebar flex">
        <div className="flex-fill">
          <a className="ctrl back" onClick={this.onClickBack}><i className="fa fa-angle-left" /></a>
          <div className="nav">
            <NavLink to="/" selected={location === '/' || location.indexOf('/newsfeed/') === 0} icon="newspaper-o" label="Feed" />
            <NavLink to="/inbox" icon="inbox" label="Inbox" count={this.state.indexCounts.inboxUnread} />
            <NavLink to="/profile" icon="users" label="Contacts" />
            <NavLink to="/sync" icon={isWifiMode?'wifi':'globe'} label='Network' />
            <Issues />
          </div>
          <div className="divider" />
          <NavToggle to="bookmarks" icon="bookmark" count={this.state.indexCounts.bookmarksUnread} />
          <NavToggle to="notifications" icon="bell" count={this.state.indexCounts.notificationsUnread} />
        </div>
        <div>
          <div className="search"><i className="fa fa-search" /><input ref="search" onKeyDown={this.onSearchKeyDown.bind(this)} /></div>
        </div>
      </div>
      <div className="layout-columns">
        <div id="mainview">{this.props.children}</div>
        { (RightNavView) ? <div id="rightnav"><RightNavView location={this.props.location} {...this.state.rightNavProps} /></div> : '' }
      </div>
      <FindBar ref="find" for="mainview" />
    </div>
  }
}