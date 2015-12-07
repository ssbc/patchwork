'use babel'
import React from 'react'
import ModalSingle from './single'
import app from '../../lib/app'

export default class ModalBtn extends React.Component {
  constructor(props) {
    super(props)
    this.state = { isOpen: false }
    this.on = {
      open: () => { this.setState({ isOpen: true }) },
      close: () => { this.setState({ isOpen: false }) }
    }
  }
  render() {
    return <span>
      <a onClick={this.on.open} className={this.props.className}>
        {this.props.children}
      </a>
      <ModalSingle {...this.props} isOpen={this.state.isOpen} onClose={this.on.close} />
    </span>
  }
}