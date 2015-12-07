'use babel'
import React from 'react'
import Composer from './index'
import { UserPic } from '../index'
import app from '../../lib/app'

export default class ComposerCard extends React.Component {
  constructor(props) {
    super(props)
    this.state = { isOpen: false }
  }
  onClick() {
    this.setState({ isOpen: true }, () => {
      // focus the textarea
      this.refs.container.querySelector('input[type=text], textarea').focus()
    })
  }
  onSend() {
    this.setState({ isOpen: false })
  }
  render() {
    return <div ref="container" className={'composer-card '+(this.state.isOpen?'open':'')}>
      <div className="left-meta"><UserPic id={app.user.id} /></div>
      { this.state.isOpen ?
        <Composer {...this.props} onSend={this.onSend.bind(this)} /> :
        <div className="composer placeholder" onClick={this.onClick.bind(this)}>{this.props.placeholder}</div> }
    </div>
  }
}