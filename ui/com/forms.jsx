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