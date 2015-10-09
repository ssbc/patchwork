'use babel'
import React from 'react'
import xtend from 'xtend'
import ref from 'ssb-ref'
import { ModalBtn } from './index'
import { RenameForm, FlagUserForm, InviteForm } from './forms'

export class PromptModalBtn extends ModalBtn {
  constructor(props) {
    super(props)
    this.label = this.props.btnLabel
    this.state = { value: '' }
  }
  onChange(e) {
    this.setState({ value: e.target.value })
  }
  onSubmit(e) {
    e.preventDefault()
    this.on.close()
    this.props.onSubmit(this.state.value)
  }
  renderModal() {
    return <div>
      {this.props.children}
      <form onSubmit={this.onSubmit.bind(this)}>
        <input type="text" value={this.state.value} onChange={this.onChange.bind(this)} placeholder={this.props.placeholder||''} />
        <button>{this.props.submitLabel||'Submit'}</button>
      </form>
    </div>
  }
}

export class RenameModalBtn extends ModalBtn {
  constructor(props) {
    super(props)
    this.label = 'Rename'
  }
  onSubmit(name) {
    this.on.close()
    this.props.onSubmit(name)
  }
  renderModal() {
    return <RenameForm name={this.props.name} onSubmit={this.onSubmit.bind(this)} />
  }
}

export class FlagUserModalBtn extends ModalBtn {
  constructor(props) {
    super(props)
    this.label = 'Flag'
  }
  onSubmit(flag, reason) {
    this.on.close()
    this.props.onSubmit(flag, reason)
  }
  renderModal() {
    return <FlagUserForm name={this.props.name} onSubmit={this.onSubmit.bind(this)} />
  }
}

export class InviteModalBtn extends ModalBtn {
  constructor(props) {
    super(props)
    this.label = this.props.btnModal||'Join a Pub'
    this.state = xtend(this.state, { info: false, error: false, isProcessing: false })
  }
  onSubmit(code) {
    this.setState({ isProcessing: true, error: false, info: false })

    // surrounded by quotes?
    // (the scuttlebot cli ouputs invite codes with quotes, so this could happen)
    if (code.charAt(0) == '"' && code.charAt(code.length - 1) == '"')
      code = code.slice(1, -1) // strip em

    // validate
    if (!ref.isInvite(code))
      return this.setState({ isProcessing: false, error: 'Invalid invite code' })

    // use the invite
    this.setState({ info: 'Contacting server with invite code, this may take a few moments...' })
    app.ssb.invite.accept(code, (err) => {
      if (err) {
        console.error(err)
        return this.setState({ isProcessing: false, info: false, error: userFriendlyInviteError(err.stack || err.message) })
      }

      // trigger sync with the pub
      app.ssb.gossip.connect(code.split('~')[0])

      // nav to the newsfeed for the livestream
      this.on.close()
      this.props.onUseInvite && this.props.onUseInvite()
    })
  }
  renderModal() {
    return <InviteForm info={this.state.info} error={this.state.error} isDisabled={this.state.isProcessing} onSubmit={this.onSubmit.bind(this)} />
  }
}
// invite-modal error helper
function userFriendlyInviteError(msg) {
  if (~msg.indexOf('incorrect or expired') || ~msg.indexOf('has expired'))
    return 'Invite code is incorrect or expired. Make sure you copy/pasted it correctly. If you did, ask the pub-server owner for a new code and try again.'
  if (~msg.indexOf('invalid') || ~msg.indexOf('feed to follow is missing') || ~msg.indexOf('may not be used to follow another key'))
    return 'Invite code is malformed. Make sure you copy/pasted it correctly. If you did, ask the pub-server owner for a new code and try again.'
  if (~msg.indexOf('pub server did not have correct public key'))
    return 'The pub server did not identify itself correctly for the invite code. Ask the pub-server owner for a new code and try again.'
  if (~msg.indexOf('unexpected end of parent stream'))
    return 'Failed to connect to the pub server. Check your connection, make sure the pub server is online, and try again.'
  if (~msg.indexOf('ENOTFOUND'))
    return 'The pub server could not be found. Check your connection, make sure the pub server is online, and try again.'
  if (~msg.indexOf('already following'))
    return 'You are already followed by this pub server.'
  return 'Sorry, an unexpected error occurred. Please try again.'
}