'use babel'
import React from 'react'

export default class Prompt extends React.Component {
  constructor(props) {
    super(props)
    this.state = { value: '' }
  }
  onChange(e) {
    this.setState({ value: e.target.value })
  }
  submit(e) {
    e.preventDefault()
    this.on.close()
    this.props.onSubmit(this.state.value)
  }
  renderModal() {
    return <div>
      {this.props.children}
      <form onSubmit={this.onSubmit.bind(this)}>
        <input type="text" value={this.state.value} onChange={this.onChange.bind(this)} placeholder={this.props.placeholder||''} />
        <button>{this.props.submitLabel||'Submit'}</button>
      </form>
    </div>
  }
}
