'use babel'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import { rainbow } from '../index'
import app from '../../lib/app'

function getCurrentName (id) {
  return app.users.names[id]||''
}

export default class Rename extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.validate(getCurrentName(this.props.id), true)    
  }

  componentDidMount() {
    this.validate(getCurrentName(this.props.id))
    this.props.setHelpText('You can rename anybody! Other people can see the name you choose, but it will only affect you.')
  }

  onChange(e) {
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
        error: 'We\'re sorry, names can only include A-z 0-9 . _ - and cannot have spaces.',
        isValid: false
      }
    } else if (name.slice(-1) == '.') {
      emit(false)
      return {
        name: name,
        error: 'We\'re sorry, names cannot end with a period.',
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

  submit(cb) {
    const currentName = getCurrentName(this.props.id)
    const newName = this.state.name
    if (currentName === newName)
      return cb()
    app.ssb.publish(schemas.name(this.props.id, newName), err => {
      if (err)
        return cb(err)
      app.fetchLatestState(cb)
    })
  }

  render() {
    return <div>
      <form className="fullwidth" onSubmit={e=>e.preventDefault()}>
        <fieldset>
          <h1>{rainbow('Rename')} {getCurrentName(this.props.id)}</h1>
          <label><span/><input type="text" value={this.state.name} onChange={this.onChange.bind(this)} /></label>
          <div className="error">{this.state.error}</div>
        </fieldset>
      </form>
    </div>
  }
}