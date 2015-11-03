'use babel'
import React from 'react'
import ImageInput from './image-input'
import { InviteErrorExplanation, InviteErrorHelp } from './help/forms'
import app from '../lib/app'

export class SetupForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.validate(app.users.names[app.user.id]||'')
  }

  onChangeName(e) {
    this.setState(this.validate(e.target.value))
  }

  validate (name) {
    let badNameCharsRegex = /[^A-z0-9\._-]/
    if (!name.trim()) {
      return { error: false, isValid: false, name: name }
    } else if (badNameCharsRegex.test(name)) {
      return {
        name: name,
        error: 'We\'re sorry, your name can only include A-z 0-9 . _ - and cannot have spaces.',
        isValid: false
      }
    } else if (name.slice(-1) == '.') {
      return {
        name: name,
        error: 'We\'re sorry, your name cannot end with a period.',
        isValid: false
      }
    } else {
      return {
        name: name,
        error: false,
        isValid: true
      }
    }
  }

  onSubmit(e) {
    e.preventDefault()
    const canvas = this.refs.imageInputContainer.querySelector('canvas')
    if (canvas) {
      ImageInput.uploadCanvasToBlobstore(canvas, (err, hasher) => {
        const imageLink = {
          link: '&'+hasher.digest,
          size: hasher.size,
          type: 'image/png',
          width: 512,
          height: 512
        }
        this.props.onSubmit({ name: this.state.name, image: imageLink })
      })
    } else {
      this.props.onSubmit({ name: this.state.name })      
    }
  }

  onCancel(e) {
    e.preventDefault()
    e.stopPropagation()
    this.props.onRequestClose()
  }

  getCurrentImg() {
    const profile = app.users.profiles[app.user.id]
    if (profile && profile.self.image)
      return 'http://localhost:7777/' + profile.self.image.link
  }

  render() {
    const isNew = !app.users.names[app.user.id]
    const currentImg = this.getCurrentImg()

    return <form className="stacked" onSubmit={this.onSubmit.bind(this)}>
      <fieldset style={{width: '600px'}}>
        <h1>{isNew ? 'New Account' : 'Edit Your Profile'}</h1>
        <div>
          <label>
            <span>nickname</span>
            <input type="text" onChange={this.onChangeName.bind(this)} value={this.state.name} />
            { this.state.error ? <p className="error">{this.state.error}</p> : '' }
          </label>
        </div>
        <div ref="imageInputContainer"><ImageInput label="picture" current={currentImg} /></div>
      </fieldset>
      <div className="toolbar">
        {isNew ? '' : <button className="btn cancel" tabIndex="-1" onClick={this.onCancel.bind(this)}><i className="fa fa-times" /> Discard</button>}
        <button className="btn ok" disabled={!this.state.isValid}>Save <i className="fa fa-check" /></button>
      </div>
    </form>
  }
}

export class RenameForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      name: this.props.name
    }
    this.on = {
      change: (e) => {
        this.setState({ name: e.target.value })
      },
      submit: (e) => {
        e.preventDefault()
        this.props.onSubmit(this.state.name)
      }
    }
  }
  render() {
    return <div>
      <h2>Rename {this.props.name}</h2>
      <div><small>You can rename anybody! Other people can see the name you choose, but it will only affect you.</small></div>
      <form onSubmit={this.on.submit}>
        <input type="text" value={this.state.name} onChange={this.on.change} />
        <button className="btn">Save</button>
      </form>
    </div>
  }
}

export class InviteForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      code: this.props.code
    }
    this.on = {
      change: (e) => {
        this.setState({ code: e.target.value })
      },
      submit: (e) => {
        e.preventDefault()
        if (this.state.code)
          this.props.onSubmit(this.state.code)
      }
    }
  }
  render() {
    const msg = (this.props.error) ?
      <InviteErrorExplanation error={this.props.error} /> :
      (this.props.info || '')
    const helpText = (this.props.error) ? <InviteErrorHelp error={this.props.error} /> : ''
    return <div>
      <form className="fullwidth" onSubmit={this.on.submit}>
        <fieldset>
          <h1>Join a Pub!</h1>
          <input type="text" value={this.state.code} onChange={this.on.change} placeholder="Enter the invite code here" />
          <div className="flex">
            <div className="flex-fill">{msg}</div>
            <div><button className="btn highlighted" disabled={this.props.isDisabled}>Use Code</button></div>
          </div>
          {helpText}
          <div><strong>Pubs let you connect globally.</strong></div>
          <div>{'Don\'t have an invite? You\'ll have to find an operator and ask for one. Ask the folks in #scuttlebutt, on Freenode.'}</div>
          <div>Neckbeards can setup their own pubs. <a href="https://github.com/ssbc/docs#setup-up-a-pub" target="_blank">Read the setup documentation here.</a></div>
        </fieldset>
      </form>
    </div>
  }
}