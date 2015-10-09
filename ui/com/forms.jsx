'use babel'
import React from 'react'

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

export class FlagUserForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      flag: '',
      reason: ''
    }
    this.on = {
      selectFlag: (e) => { this.setState({ flag: e.target.value }) },
      changeReason: (e) => { this.setState({ reason: e.target.value }) },
      submit: (e) => {
        e.preventDefault()
        if (!this.state.flag)
          return
        this.props.onSubmit(this.state.flag, this.state.reason)
      }
    }
  }
  render() {
    return <div>
      <h2>Flag {this.props.name}</h2>
      <p><small>Warn your friends and followers about this user.</small></p>
      <form onSubmit={this.on.submit}>
        <div><label><input type="radio" name="flag" onChange={this.on.selectFlag} value="old-account">Old account</input></label></div>
        <div><label><input type="radio" name="flag" onChange={this.on.selectFlag} value="spammer">Spammer</input></label></div>
        <div><label><input type="radio" name="flag" onChange={this.on.selectFlag} value="abusive">Abusive</input></label></div>
        <div><label><input type="radio" name="flag" onChange={this.on.selectFlag} value="nsfw">NSFW</input></label></div>
        <div><label><input type="radio" name="flag" onChange={this.on.selectFlag} value="other">Other</input></label></div>
        <div><textarea value={this.state.reason} onChange={this.on.changeReason} placeholder="Write your reason for flagging here." /></div>
        <button>Publish</button>
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