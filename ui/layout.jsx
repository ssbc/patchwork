'use babel'
import React from 'react'
import { Link } from 'react-router'
import ssbref from 'ssb-ref'
import app from './lib/app'
import ModalFlow from './com/modals/flow'
import Notifications from './com/msg-list/notifications'
import ProfileSetup from './com/forms/profile-setup'
import FollowNearby from './com/forms/follow-nearby'
import PubInvite from './com/forms/pub-invite'
import Issues from './com/issues'
import FindBar from './com/findbar'

const SETUP_LABELS = [<i className="fa fa-user"/>, <i className="fa fa-wifi"/>, <i className="fa fa-cloud"/>]
const SETUP_FORMS = [ProfileSetup, FollowNearby, PubInvite]
const RIGHT_NAVS = {
  notifications: Notifications
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
      rightNav: (this.state) ? this.state.rightNav : 'notifications',
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
      const cls = (props.className||'')+' ctrl '+(selected?'selected':'')
      const count = props.count ? <div className="count">{props.count}</div> : ''
      return <Link className={cls} to={props.to}><i className={'fa fa-'+props.icon} /><span className="label">{props.label}</span> {count}</Link>
    }
    const NavToggle = (props) => {
      const selected = (props.to === this.state.rightNav)
      const cls = (props.className||'')+' ctrl '+(selected?'selected':'')
      const count = props.count ? <div className="count">{props.count}</div> : ''
      return <a className={cls} onClick={onToggleRightNav(props.to)}><i className={'fa fa-'+props.icon} /> {count}</a>
    }

    return <div className="layout-rows">
      <ModalFlow fullheight labels={SETUP_LABELS} Forms={SETUP_FORMS} isOpen={this.state.setupIsOpen} cantClose={this.state.setupCantClose} />
      <div className="toolbar titlebar flex">
        <div>
          <a className="ctrl back" onClick={this.onClickBack}><i className="fa fa-angle-left" /></a>
          <NavLink className="home" to="/" selected={location === '/' || location.indexOf('/newsfeed/') === 0} icon="home" />
        </div>
        <div className="flex-fill">
          <div className="search"><i className="fa fa-search" /><input ref="search" placeholder="Search for people or content" onKeyDown={this.onSearchKeyDown.bind(this)} /></div>
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