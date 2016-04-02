'use babel'
import React from 'react'
import Composer from './index'
import { UserPic } from 'patchkit-links'
import app from '../../lib/app'

export default class ComposerCard extends React.Component {
  constructor(props) {
    super(props)
    this.state = { isOpen: false }
  }
  onClick() {
    this.setState({ isOpen: true }, () => {
      // focus the textarea
      if (this.props.recps) // if recps are provided, focus straight onto the textarea
        this.refs.container.querySelector('textarea').focus()
      else
        this.refs.container.querySelector('input[type=text], textarea').focus()

      // after the expand animation, remove the max-height limit so that the preview can expand
      setTimeout(() => this.refs.container.style.maxHeight = '100%', 1e3)
    })
  }
  onSend(msg) {
    this.setState({ isOpen: false })
    if (this.props.onSend)
      this.props.onSend(msg)
  }
  render() {
    return <div ref="container" className={'composer-card '+(this.state.isOpen?'open':'')}>
      <div className="left-meta"><UserPic id={app.user.id} /></div>
      { this.state.isOpen ?
        <Composer {...this.props} onSend={this.onSend.bind(this)} /> :
        <div className="composer placeholder" onClick={this.onClick.bind(this)}>{this.props.placeholder||'Write your message here'}</div> }
    </div>
  }
}