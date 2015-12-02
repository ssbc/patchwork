'use babel'
import React from 'react'
import ImageInput from './image-input'
import { InviteErrorExplanation, InviteErrorHelp } from './help/forms'
import app from '../lib/app'

class RadioSet extends React.Component {
  render () {
    return <div className={this.props.className}>
      { this.props.options.map((option, i) => {
        return (
          <label key={'option'+i}>
            <input type="radio"
              name={this.props.group} 
              value={option.value} 
              defaultChecked={option.checked}
              onChange={()=>this.props.onChange(option.value)} />
            {option.label}
          </label>
        )
      }) }
    </div>
  }
}

export class SetupForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.validate(app.users.names[app.user.id]||'', true)
  }

  onChangeName(e) {
    this.setState(this.validate(e.target.value))
  }

  validate (name, supressEmit) {
    let badNameCharsRegex = /[^A-z0-9\._-]/
    const emit = (b) => { this.props.onValidChange && !supressEmit && this.props.onValidChange(b) }
    if (!name.trim()) {
      emit(false)
      return { error: false, isValid: false, name: name }
    } else if (badNameCharsRegex.test(name)) {
      emit(false)
      return {
        name: name,
        error: 'We\'re sorry, your name can only include A-z 0-9 . _ - and cannot have spaces.',
        isValid: false
      }
    } else if (name.slice(-1) == '.') {
      emit(false)
      return {
        name: name,
        error: 'We\'re sorry, your name cannot end with a period.',
        isValid: false
      }
    } else {
      emit(true)
      return {
        name: name,
        error: false,
        isValid: true
      }
    }
  }

  getValues(done) {
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
        done({ name: this.state.name, image: imageLink })
      })
    } else {
      done({ name: this.state.name })      
    }    
  }

  onSubmit(e) {
    e.preventDefault()
    this.getValues(this.props.onSubmit)
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

    return <form className="block" onSubmit={this.onSubmit.bind(this)}>
      <fieldset>
        <div>
          <label>
            <span>Name</span>
            <input type="text" onChange={this.onChangeName.bind(this)} value={this.state.name} />
            { this.state.error ? <p className="error">{this.state.error}</p> : '' }
          </label>
        </div>
        <div ref="imageInputContainer"><ImageInput label="Image" current={currentImg} /></div>
      </fieldset>
    </form>
  }
}

export class RenameForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = { name: this.props.name }
  }

  onChange(e) {
    this.setState(this.validate(e.target.value))
  }

  validate (name) {
    let badNameCharsRegex = /[^A-z0-9\._-]/
    if (!name.trim()) {
      return { error: false, isValid: false, name: name }
    } else if (badNameCharsRegex.test(name)) {
      return {
        name: name,
        error: 'We\'re sorry, names can only include A-z 0-9 . _ - and cannot have spaces.',
        isValid: false
      }
    } else if (name.slice(-1) == '.') {
      return {
        name: name,
        error: 'We\'re sorry, names cannot end with a period.',
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
    this.props.onSubmit(this.state.name)
  }

  render() {
    return <div>
      <form className="fullwidth" onSubmit={this.onSubmit.bind(this)}>
        <fieldset>
          <h1>Rename {this.props.name}</h1>
          <div><small>You can rename anybody! Other people can see the name you choose, but it will only affect you.</small></div>
          <label><span/><input type="text" value={this.state.name} onChange={this.onChange.bind(this)} /></label>
          <div className="flex">
            <div className="flex-fill">{this.state.error}</div>
            <div><button className="btn" disabled={!this.state.isValid}>Save</button></div>
          </div>
        </fieldset>
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
          <div>{'Don\'t have an invite? You\'ll have to find a pub operator and ask for one. Ask the folks in #scuttlebutt, on Freenode.'}</div>
          <div>Neckbeards can setup their own pubs. <a href="https://github.com/ssbc/docs#setup-up-a-pub" target="_blank">Read the setup documentation here.</a></div>
        </fieldset>
      </form>
    </div>
  }
}

export class FlagMsgForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = { reason: 'spam' }
  }

  onChange(reason) {
    this.setState({ reason: reason })
  }

  onSubmit(e) {
    e.preventDefault()
    this.props.onSubmit(this.state.reason)
  }

  render() {
    return <div>
      <form className="inline" onSubmit={this.onSubmit.bind(this)}>
        <fieldset>
          <h1><i className="fa fa-flag" /> Flag this Message</h1>
          <div><small>{"Flagging hides unwanted/negative content. What's your reason for flagging this message?"}</small></div>
          <RadioSet group="reason" options={[{ label: 'Spam', value: 'spam', checked: true }, { label: 'Abusive', value: 'abuse' }]} onChange={this.onChange.bind(this)} />
          <div className="flex">
            <div className="flex-fill" />
            <div><button className="btn">Flag</button></div>
          </div>
        </fieldset>
      </form>
    </div>
  }
}