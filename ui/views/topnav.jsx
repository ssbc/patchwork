'use babel'
import React from 'react'
import { Link } from 'react-router'

export default class TopNav extends React.Component {
  onBack() {
    history.back()
  }
  onForward() {
    history.forward()
  }
  render() {
    return <div id="topnav">
      <a onClick={this.onBack.bind(this)}>back</a>{' '}
      <a onClick={this.onForward.bind(this)}>forward</a>
    </div>
  }
}