'use babel'
import React from 'react'
import xtend from 'xtend'
import ref from 'ssb-ref'
import schemas from 'ssb-msg-schemas'
import Modal from 'react-modal'
import Composer from './composer'
import app from '../lib/app'
import { SetupForm, RenameForm, InviteForm } from './forms'

const MODAL_STYLES = {
  overlay : {
    position          : 'fixed',
    top               : 0,
    left              : 0,
    right             : 0,
    bottom            : 0,
    backgroundColor   : 'rgba(100, 100, 100, 0.75)',
    zIndex            : 1000
  },
  content : {
    position                   : 'absolute',
    top                        : '40px',
    bottom                     : 'auto',
    left                       : '50%',
    right                      : 'auto',
    maxHeight                  : '90%',
    transform                  : 'translateX(-50%)',
    boxShadow                  : '0px 24px 48px rgba(0, 0, 0, 0.2)',
    borderRadius               : '0',
    border                     : '0',
    background                 : '#fff',
    overflow                   : 'auto',
    WebkitOverflowScrolling    : 'touch',
    outline                    : 'none',
    padding                    : '0'
  }
}

export class ModalContainer extends React.Component {
  render() {
    if (!this.props.isOpen)
      return <span/>
    return <Modal isOpen onRequestClose={this.props.onRequestClose} style={MODAL_STYLES}>{this.props.children}</Modal>
  }
}

export class ModalBtn extends React.Component {
  constructor(props) {
    super(props)
    this.state = { isOpen: false }
    this.on = {
      open: () => { this.setState({ isOpen: true }) },
      close: () => { this.setState({ isOpen: false }) }
    }
  }
  render() {
    const children = this.renderModal ? this.renderModal() : this.props.children
    return <a onClick={this.on.open} className={this.props.className}>
      {this.label || this.props.label}
      <Modal isOpen={this.state.isOpen} onRequestClose={this.on.close} style={MODAL_STYLES}>{children}</Modal>
    </a>
  }
}

export class SetupModal extends React.Component {
  constructor(props) {
    super(props)
  }

  onSubmit(values) {
    let n = 0, m = 0
    const done = () => {
      if (++n >= m) {
        if (app.user.needsSetup)
          window.location.hash = '#/help/welcome'
        else
          app.fetchLatestState()
        this.onClose()
      }
    }

    if (values.name) {
      if (values.name !== app.users.names[app.user.id]) {
        m++
        app.ssb.publish(schemas.name(app.user.id, values.name), function (err) {
          if (err)
            app.issue('Error While Publishing', err, 'Setup modal publishing new about msg')
          done()
        })
      }
    }
    if (values.image) {
      const profile = app.users.profiles[app.user.id]
      const selfImg = profile && profile.self.image
      if (!selfImg || values.image.link !== selfImg.link) {
        m++
        app.ssb.publish(schemas.image(app.user.id, values.image), function (err) {
          if (err)
            app.issue('Error While Publishing', err, 'Setup modal publishing new about msg')
          done()
        })
      }
    }
    if (m === 0)
      done()
  }

  onClose() {
    if (this.props.cantClose)
      return
    app.emit('modal:setup', false)
  }

  render() {
    return <Modal isOpen={this.props.isOpen} onRequestClose={this.onClose.bind(this)} style={MODAL_STYLES}>
      <SetupForm onSubmit={this.onSubmit.bind(this)} onRequestClose={this.onClose.bind(this)} />
    </Modal>
  }
}

export class FABComposerModal extends ModalBtn {
  render() {
    return <div className="fab">
      <a className="primary" onClick={this.on.open} data-label={this.props.label||'Compose'}><i className={'fa fa-'+(this.props.icon||'pencil')} /></a>
      <Modal isOpen={this.state.isOpen} onRequestClose={this.on.close} style={MODAL_STYLES}><Composer onSend={this.on.close} /></Modal>
    </div>
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
    this.label = <span><i className="fa fa-pencil" /> Rename</span>
  }
  onSubmit(name) {
    this.on.close()
    this.props.onSubmit(name)
  }
  renderModal() {
    return <RenameForm name={this.props.name} onSubmit={this.onSubmit.bind(this)} />
  }
}

export class InviteModalBtn extends ModalBtn {
  constructor(props) {
    super(props)
    this.label = this.props.btnModal||(<span><i className="fa fa-cloud-upload"/> Join a Pub</span>)
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
      return this.setState({ isProcessing: false, error: { msg: 'Invalid invite code' } })

    // use the invite
    this.setState({ info: 'Contacting server with invite code, this may take a few moments...' })
    app.ssb.invite.accept(code, (err) => {
      if (err) {
        console.error(err)
        return this.setState({ isProcessing: false, info: false, error: err })
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