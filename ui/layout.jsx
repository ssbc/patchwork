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
    // update state on first render
    app.fetchLatestState()
  }
  componentWillReceiveProps() {
    // update state on view changes
    app.fetchLatestState()
  }
  render() {
    return <div className="layout-rows">
      <div id="topnav"></div>
      <div className="layout-columns">
        <div id="leftnav"><LeftNav location={this.props.location.pathname} /></div>
        <div id="mainview">{this.props.children}</div>
      </div>
    </div>
  }
}