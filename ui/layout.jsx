'use babel'
import React from 'react'
import { Link } from 'react-router'
import classNames from 'classnames'
import app from './lib/app'
import ModalFlow from './com/modals/flow'
import Welcome from './com/forms/welcome'
import ProfileName from './com/forms/profile-name'
import ProfileImage from './com/forms/profile-image'
import FindBar from './com/findbar'
import desktopNotifications from './lib/desktop-notifications'

const SETUP_FORMS = [Welcome, ProfileName, ProfileImage]

export default class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.buildState()

    // listen for app change-events that should update our state
    const refresh = () => { this.setState(this.buildState()) }
    app.on('update:all', refresh)
    app.on('focus:find', this.focusFind.bind(this))
    app.on('modal:setup', isOpen => { this.setState({ setupIsOpen: isOpen }); app.fetchLatestState() })
    app.on('find:next', this.doFind.bind(this, true))
    app.on('find:previous', this.doFind.bind(this, false))

    desktopNotifications.stream(app.ssb.patchwork.createNotificationsStream)
  }
  componentWillReceiveProps() {
    // update state on view changes
    app.fetchLatestState()
  }
  buildState() {
    // copy over app state
    return {
      setupIsOpen: app.user.needsSetup,
      isComposerOpen: app.isComposerOpen
    }
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
    return <div className="layout-rows">
      <ModalFlow className="fullheight" Forms={SETUP_FORMS} isOpen={this.state.setupIsOpen} onClose={this.onSetupClose.bind(this)} />
      <div className="layout-columns">
        <div id="mainview">{this.props.children}</div>
      </div>
      <FindBar ref="find" for="mainview" />
    </div>
  }
}