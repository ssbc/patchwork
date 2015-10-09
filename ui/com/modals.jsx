'use babel'
import React from 'react'
import xtend from 'xtend'
import ref from 'ssb-ref'
import schemas from 'ssb-msg-schemas'
import Modal from 'react-modal'
import app from '../lib/app'
import { ModalBtn } from './index'
import { SetupForm, RenameForm, FlagUserForm, InviteForm } from './forms'

export class SetupModal extends React.Component {
  constructor(props) {
    super(props)
  }

  onSubmit(name) {
    if (!name.trim())
      return
    if (name === app.users.names[app.user.id])
      return this.onClose()
    // publish
    app.ssb.publish(schemas.about(app.user.id, name), function (err) {
      if (err) app.issue('Error While Publishing', err, 'Setup modal publishing new about msg')
      else app.fetchLatestState()
    })
  }

  onClose() {
    if (this.props.cantClose)
      return
    app.emit('modal:setup', false)
  }

  render() {
    let modalStyle = {
      overlay : {
        position          : 'fixed',
        top               : 0,
        left              : 0,
        right             : 0,
        bottom            : 0,
        backgroundColor   : 'rgba(255, 255, 255, 0.75)',
        zIndex            : 1000
      },
      content : {
        position                   : 'absolute',
        top                        : '40px',
        left                       : '40px',
        right                      : '40px',
        bottom                     : '40px',
        border                     : '1px solid #ccc',
        background                 : '#fff',
        overflow                   : 'auto',
        WebkitOverflowScrolling    : 'touch',
        borderRadius               : '4px',
        outline                    : 'none',
        padding                    : '20px'
      }
    }
    return <Modal isOpen={this.props.isOpen} onRequestClose={this.onClose.bind(this)} style={modalStyle}>
      <SetupForm onSubmit={this.onSubmit.bind(this)} />
    </Modal>
  }

}

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