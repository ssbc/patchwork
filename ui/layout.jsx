'use babel'
import React from 'react'

export default class Main extends React.Component {
  render() {
    return <div className="layout-rows">
      <div id="topnav"></div>
      <div className="layout-columns">
        <div id="leftnav"></div>
        <div id="mainview"></div>
      </div>
    </div>
  }
}