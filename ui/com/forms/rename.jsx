'use babel'
import React from 'react'
import schemas from 'ssb-msg-schemas'
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
    this.props.setHelpText('You can rename anybody. It will only change for you, but other people will see the name you chose.')
  }

  onChange(e) {
    this.setState(this.validate(e.target.value))
  }

  validate (name, supressEmit) {
    let badNameCharsRegex = /[^A-Za-z0-9\._-]/
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
    return <div className="text-center vertical-center">
      <form className="block" onSubmit={e=>e.preventDefault()}>
        <fieldset>
          <h1>Rename {getCurrentName(this.props.id)} to...</h1>
          <label><span/><input type="text" value={this.state.name} onChange={this.onChange.bind(this)} /></label>
          <div className="error">{this.state.error}</div>
        </fieldset>
      </form>
    </div>
  }
}