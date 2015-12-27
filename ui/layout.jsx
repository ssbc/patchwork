'use babel'
import React from 'react'
import { Link } from 'react-router'
import app from './lib/app'
import ModalFlow from './com/modals/flow'
import Notifications from './com/msg-list/notifications'
import Welcome from './com/forms/welcome'
import ProfileSetup from './com/forms/profile-setup'
import FollowNearby from './com/forms/follow-nearby'
import PubInvite from './com/forms/pub-invite'
import SearchPalette from './com/search-palette'
import ProfileName from './com/forms/profile-name'
import ProfileImage from './com/forms/profile-image'
import Friends from './com/forms/friends'
import Issues from './com/issues'
import FindBar from './com/findbar'

const SETUP_LABELS = [
  <span><i className="fa fa-power-off"/><br/><small>Welcome</small></span>,
  <span><i className="fa fa-pencil"/><br/><small>Nickname</small></span>,
  <span><i className="fa fa-photo"/><br/><small>Photo</small></span>,
  <span><i className="fa fa-check-square"/><br/><small>Start</small></span>
]
const SETUP_FORMS = [Welcome, ProfileName, ProfileImage, Friends]
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

  render() {
    const isElectron = !!window.electron
    const location = this.props.location.pathname
    const isWifiMode = this.state.isWifiMode
    const onToggleRightNav = (id) => () => { this.toggleRightNav(id) }
    const RightNavView = (this.state.rightNav) ? RIGHT_NAVS[this.state.rightNav] : null

    const NavLink = (props) => {
      const selected = false //props.selected || (props.to === location)
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
      <ModalFlow className="fullheight" labels={SETUP_LABELS} Forms={SETUP_FORMS} isOpen={this.state.setupIsOpen} cantClose={this.state.setupCantClose} />
      <div className="toolbar titlebar flex">
        <div>
          { isElectron
            ? <a className="ctrl back" onClick={this.onClickBack}><i className="fa fa-angle-left" /></a>
            : '' }
          <NavLink className="home" to="/" icon="home" />
        </div>
        <div className="flex-fill"><SearchPalette ref="search"/></div>
        <div>
          <NavToggle to="notifications" icon="bell" count={this.state.indexCounts.notificationsUnread} />
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
