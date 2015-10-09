'use babel'
import React from 'react'
import { ModalBtn } from './index'
import { RenameForm, FlagUserForm } from './forms'

export class PromptModalBtn extends ModalBtn {
  constructor(props) {
    super(props)
    this.label = this.props.btnLabel
    this.state = { value: '' }
  }
  onChange(e) {
    this.setState({ value: e.target.value })
  }
  onSubmit(e) {
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

export class RenameModalBtn extends ModalBtn {
  constructor(props) {
    super(props)
    this.label = 'Rename'
  }
  onSubmit(name) {
    this.on.close()
    this.props.onSubmit(name)
  }
  renderModal() {
    return <RenameForm name={this.props.name} onSubmit={this.onSubmit.bind(this)} />
  }
}

export class FlagUserModalBtn extends ModalBtn {
  constructor(props) {
    super(props)
    this.label = 'Flag'
  }
  onSubmit(flag, reason) {
    this.on.close()
    this.props.onSubmit(flag, reason)
  }
  renderModal() {
    return <FlagUserForm name={this.props.name} onSubmit={this.onSubmit.bind(this)} />
  }
}