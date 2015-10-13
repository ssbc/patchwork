'use babel'
import React from 'react'

export default class People extends React.Component {
  onSend() {
    this.props.history.pushState(null, '/')
  }
  render() {
    return <div id="people">todo</div>
  }
}