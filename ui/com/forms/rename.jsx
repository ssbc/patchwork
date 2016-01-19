'use babel'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import { rainbow } from '../index'
import app from '../../lib/app'

export default class Rename extends React.Component {
  constructor(props) {
    super(props)
    this.state = {name: '', currentName: this.props.id}
    app.ssb.names.signifier(this.props.id, (_, names) => {
      for(var k in names) {
        var s = this.validate(k)
        s.currentName = k
        return this.setState(s)
      }
    })
  }

  componentDidMount() {
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
    if(!this.state.name) return cb()

    if (this.state.currentName === this.state.name)
      return cb()

    app.ssb.publish(schemas.name(this.props.id, this.state.name), err => {
      if (err)
        return cb(err)
      app.fetchLatestState(cb)
    })
  }

  render() {
    return <div>
      <form className="fullwidth" onSubmit={e=>e.preventDefault()}>
        <fieldset>
          <h1>{rainbow('Rename')} {this.state.currentName}</h1>
          <label><span/><input type="text" value={this.state.name} onChange={this.onChange.bind(this)} /></label>
          <div className="error">{this.state.error}</div>
        </fieldset>
      </form>
    </div>
  }
}






