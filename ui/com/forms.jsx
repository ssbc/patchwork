'use babel'
import React from 'react'
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
    this.props.onSubmit(this.state.name)
  }

  render() {
    var isNew = !app.users.names[app.user.id]

    return <form onSubmit={this.onSubmit.bind(this)}>
      <div className="toolbar">
        {isNew ? '' : <button className="btn cancel" tabIndex="-1"><i className="fa fa-times" /> Discard</button>}
        <button className="btn ok" disabled={!this.state.isValid}>Save <i className="fa fa-check" /></button> {this.state.error}
      </div>
      <fieldset>
        <h1>{isNew ? 'New Account' : 'Edit Your Profile'}</h1>
        <div><label><span>nickname</span><input type="text" onChange={this.onChangeName.bind(this)} value={this.state.name} /></label></div>
        <div><label><span>picture</span><input type="text" /></label></div>
      </fieldset>
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
        this.props.onSubmit(this.state.code)
      }
    }
  }
  render() {
    let msg=''
    if (this.props.info)
      msg = <div>{this.props.info}</div>
    else if (this.props.error)
      msg = <div>{this.props.error}</div>

    return <div>
      <h3>Join a Public Node</h3>
      <form onSubmit={this.on.submit}>
        <input type="text" value={this.state.code} onChange={this.on.change} placeholder="Enter the invite code here" />
        <button className="btn" disabled={this.props.isDisabled}>Use Code</button>
      </form>
      {msg}
      <hr/>
      <div><strong>Public nodes help you communicate across the Internet.</strong></div>
      <div>Neckbeards can setup their own public nodes. <a href="https://github.com/ssbc/docs#setup-up-a-pub" target="_blank">Read the server documentation here.</a></div>
      <div>{'Don\'t have an invite to a public node? You\'ll have to find a pub owner and ask for one. Ask the folks in #scuttlebutt, on Freenode.'}</div>
    </div>
  }
}