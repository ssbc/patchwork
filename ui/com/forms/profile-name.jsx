'use babel'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import multicb from 'multicb'
import { rainbow } from '../index'
import app from '../../lib/app'

function getCurrentName() {
  return app.users.names[app.user.id]||''
}

export default class ProfileSetup extends React.Component {  
  constructor(props) {
    super(props)
    this.state = this.validate(getCurrentName(), true)
  }

  componentDidMount() {
    this.validate(this.state.name) // emit isValid update
  }

  onChangeName(e) {
    this.setState(this.validate(e.target.value))
  }

  validate (name, supressEmit) {
    let badNameCharsRegex = /[^A-z0-9\._-]/
    const emit = (b) => { this.props.setIsValid && !supressEmit && this.props.setIsValid(b) }
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

  getValues(cb) {
    const canvas = this.refs.imageInputContainer.querySelector('canvas')
    if (canvas) {
      ImageInput.uploadCanvasToBlobstore(canvas, (err, res) => {
        if (err)
          return app.issue('Failed to save image', err, 'This occurred during profile setup')
        const imageLink = {
          link: res.hash,
          size: res.size,
          type: 'image/png',
          width: 512,
          height: 512
        }
        cb({ name: this.state.name, image: imageLink })
      })
    } else {
      cb({ name: this.state.name })      
    }    
  }

  submit(cb) {
    this.getValues(values => {
      // publish update messages
      var done = multicb()
      if (values.name && values.name !== getCurrentName())
        app.ssb.publish(schemas.name(app.user.id, values.name), done())
      done(err => {
        if (err) return cb(err)

        // if in a flow, just go to next step
        if (this.props.gotoNextStep)
          return cb()

        // single modal, update app state now
        app.fetchLatestState(cb)
      })
    })
  }

  render() {
    const currentName = getCurrentName()
    return <div className="text-center vertical-center">
      <h1><span>What would you like to be called?</span></h1>
      <form className="block" onSubmit={e=>e.preventDefault()}>
        <fieldset>
          <div>
            <label>
              <span>Nickname</span>
              <input type="text" onChange={this.onChangeName.bind(this)} value={this.state.name} />
              { this.state.error ? <p className="error">{this.state.error}</p> : '' }
            </label>
          </div>
          <div ref="imageInputContainer"><ImageInput label="Image" current={(currentImg) ? ('/' + currentImg) : false} /></div>
        </fieldset>
      </form>
    </div>
  }
}
