'use babel'
import React from 'react'
import { Link } from 'react-router'
import { NotificationStack } from 'react-notification'
import classNames from 'classnames'
import PatchKit from 'patchkit'
import app from './lib/app'
import ModalFlow from 'patchkit-modal/flow'
import Welcome from './com/forms/welcome'
import ProfileName from 'patchkit-form-profile-name'
import ProfileImage from 'patchkit-form-profile-image'
import FindBar from './com/findbar'

// TODO factor out patchkit-setup-flow
const SETUP_FORMS = [Welcome, ProfileName, ProfileImage]

export default class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.buildState()

    // listen for app change-events that should update our state
    const refresh = () => { this.setState(this.buildState()) }
    app.on('update:all', refresh)
    app.on('update:notifications', refresh)
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
      setupIsOpen: app.user.needsSetup,
      isComposerOpen: app.isComposerOpen,
      notifications: app.notifications,
      user: app.user,
      users: app.users
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

  onDismissNotification(notification) {
    app.dismissNotice(notification)
  }

  render() {
    return <PatchKit user={this.state.user} users={this.state.users}>
      <div className="layout-rows">
        <ModalFlow className="fullheight" Forms={SETUP_FORMS} isOpen={this.state.setupIsOpen} onClose={this.onSetupClose.bind(this)} />
        <NotificationStack notifications={this.state.notifications} onDismiss={this.onDismissNotification.bind(this)} />
        <div className="layout-columns">
          <div id="mainview">{this.props.children}</div>
        </div>
        <FindBar ref="find" for="mainview" />
      </div>
    </PatchKit>
  }
}