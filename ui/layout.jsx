'use babel'
import React from 'react'
import app from './lib/app'
import LeftNav from './views/leftnav'

export default class Layout extends React.Component {
  constructor(props) {
    super(props)
    this.state = app
  }
  componentDidMount() {
    app.fetchLatestState()
  }
  componentWillReceiveProps() {
    app.fetchLatestState()
  }
  render() {
    return <div className="layout-rows">
      <div id="topnav"></div>
      <div className="layout-columns">
        <div id="leftnav"><LeftNav /></div>
        <div id="mainview">{this.props.children}</div>
      </div>
    </div>
  }
}