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