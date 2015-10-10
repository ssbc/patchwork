'use babel'
import React from 'react'
import Composer from '../com/composer'

export default class Data extends React.Component {
  onSend() {
    this.props.history.pushState(null, '/')
  }
  render() {
    return <div id="composer"><Composer onSend={this.onSend.bind(this)} /></div>
  }
}