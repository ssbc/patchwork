'use babel'
import React from 'react'
import { Link } from 'react-router'
import { NotificationStack } from 'react-notification'
import classNames from 'classnames'
import PatchKit from 'patchkit'
import app from './lib/app'
import SetupFlow from 'patchkit-setup-flow'
import FindBar from './com/findbar'
import t from 'patchwork-translations'

export default class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.buildState(true)
    this.events = {
      emit: app.emit.bind(app),
      on: app.on.bind(app),
      removeListener: app.removeListener.bind(app)
    }

    // listen for app change-events that should update our state
    const refresh = () => { this.setState(this.buildState()) }
    app.on('update:locale', this.updateLocale.bind(this))
    app.on('update:all', refresh)
    app.on('update:notifications', refresh)
    app.on('focus:find', this.focusFind.bind(this))
    app.on('modal:setup', isOpen => { this.setState({ setupIsOpen: isOpen }); app.fetchLatestState() })
    app.on('find:next', this.doFind.bind(this, true))
    app.on('find:previous', this.doFind.bind(this, false))
    app.on('open:msg', this.openMsg.bind(this))
  }
  componentWillReceiveProps() {
    // update state on view changes
    app.fetchLatestState()
  }
  buildState(isFirst) {
    // copy over app state
    return {
      setupIsOpen: (isFirst) ? app.user.needsSetup : (this.state && this.state.setupIsOpen),
      isComposerOpen: app.isComposerOpen,
      notifications: app.notifications,
      user: app.user,
      users: app.users
    }
  }

  openMsg(msgKey) {
    if (msgKey.key)
      msgKey = msgKey.key
    app.history.pushState(null, '/msg/' + encodeURIComponent(msgKey))
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
    app.emit('modal:setup', false)
  }

  onDismissNotification(notification) {
    app.dismissNotice(notification)
  }

  render() {
    return <PatchKit user={this.state.user} users={this.state.users} ssb={app.ssb} events={this.events}>
      <div className="layout-rows">
        <SetupFlow id={app.user.id} isOpen={this.state.setupIsOpen} onClose={this.onSetupClose.bind(this)} />
        <NotificationStack notifications={this.state.notifications} onDismiss={this.onDismissNotification.bind(this)} />
        <div className="layout-columns">
          <div id="mainview">{this.props.children}</div>
        </div>
        <FindBar ref="find" for="mainview" />
      </div>
    </PatchKit>
  }

  updateLocale() {
    this.forceUpdate()
  }
}