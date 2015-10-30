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

    return <div>
      <h1>{isNew ? 'New Account' : 'Edit Your Profile'}</h1>
      <form onSubmit={this.onSubmit.bind(this)}>
        <p><label>Your nickname: <input type="text" onChange={this.onChangeName.bind(this)} value={this.state.name} /></label></p>
        <p><button disabled={!this.state.isValid}>Save</button> {this.state.error}</p>
      </form>
    </div>
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
      <p><small>You can rename anybody! Other people can see the name you choose, but it will only affect you.</small></p>
      <form onSubmit={this.on.submit}>
        <input type="text" value={this.state.name} onChange={this.on.change} />
        <button>Save</button>
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
      msg = <p>{this.props.info}</p>
    else if (this.props.error)
      msg = <p>{this.props.error}</p>

    return <div>
      <h3>Join a Public Node</h3>
      <form onSubmit={this.on.submit}>
        <input type="text" value={this.state.code} onChange={this.on.change} placeholder="Enter the invite code here" />
        <button disabled={this.props.isDisabled}>Use Code</button>
      </form>
      {msg}
      <hr/>
      <p><strong>Public nodes help you communicate across the Internet.</strong></p>
      <p>Neckbeards can setup their own public nodes. <a href="https://github.com/ssbc/docs#setup-up-a-pub" target="_blank">Read the server documentation here.</a></p>
      <p>{'Don\'t have an invite to a public node? You\'ll have to find a pub owner and ask for one. Ask the folks in #scuttlebutt, on Freenode.'}</p>
    </div>
  }
}