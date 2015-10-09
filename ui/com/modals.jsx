'use babel'
import React from 'react'
import { ModalBtn } from './index'
import { RenameForm } from './forms'

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