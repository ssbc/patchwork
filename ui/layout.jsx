'use babel'
import React from 'react'
import app from './lib/app'
import Inbox from './views/inbox'

export default class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = app
  }
  componentDidMount() {
    console.log(this.props)
  }
  render() {
    return <div className="layout-rows">
      <div id="topnav"></div>
      <div className="layout-columns">
        <div id="leftnav"></div>
        <div id="mainview">{this.props.children || <Inbox />}</div>
      </div>
    </div>
  }
}