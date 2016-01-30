'use babel'
import React from 'react'
import { Link } from 'react-router'
import app from './lib/app'
import ModalFlow from './com/modals/flow'
import Welcome from './com/forms/welcome'
import ProfileName from './com/forms/profile-name'
import ProfileImage from './com/forms/profile-image'
import ViewMode from './com/forms/view-mode'
import Issues from './com/issues'
import SearchPalette from './com/search-palette'
import FindBar from './com/findbar'

const SETUP_FORMS = [Welcome, ProfileName, ProfileImage, ViewMode]

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
    app.on('modal:setup', isOpen => { this.setState({ setupIsOpen: isOpen }); app.fetchLatestState() })
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
      isWifiMode: app.isWifiMode,
      indexCounts: app.indexCounts||{},
      user: app.user,
      users: app.users,
      setupIsOpen: app.user.needsSetup,
      isComposerOpen: app.isComposerOpen
    }
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

  onSetupClose() {
    app.fetchLatestState()
  }

  render() {
    const isElectron = !!window.electron
    const location = this.props.location.pathname
    const isWifiMode = this.state.isWifiMode

    const NavLink = (props) => {
      const selected = props.selected || (props.to === location)
      const cls = (props.className||'')+' ctrl '+(selected?'selected':'')
      const count = props.count ? <div className="count">{props.count}</div> : ''
      return <Link className={cls} to={props.to}><i className={'fa fa-'+props.icon} /><span className="label">{props.label}</span> {count}</Link>
    }

    return <div className="layout-rows">
      <ModalFlow className="fullheight" Forms={SETUP_FORMS} isOpen={this.state.setupIsOpen} onClose={this.onSetupClose.bind(this)} />
      <div className="toolbar titlebar flex">
        <div>
          { isElectron
            ? <a className="ctrl back" onClick={this.onClickBack}><i className="fa fa-angle-left" /></a>
            : '' }
          <NavLink className="home" to="/" icon="home" />
        </div>
        <div className="flex-fill"><SearchPalette ref="search"/></div>
        <NavLink to="/sync" icon="cloud-download" />
        <NavLink to="/data" icon="database" />
      </div>
      <div className="layout-columns">
        <div id="mainview">{this.props.children}</div>
      </div>
      <FindBar ref="find" for="mainview" />
    </div>
  }
}