'use babel'
import React from 'react'

export default class Notifications extends React.Component {
  onSend() {
    this.props.history.pushState(null, '/')
  }
  render() {
    return <div id="notifications">todo</div>
  }
}