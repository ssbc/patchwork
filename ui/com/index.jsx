'use babel'
import React from 'react'
import app from '../lib/app'
import social from '../lib/social-graph'
import u from '../lib/util'

// parent class for components which should recompute their state every time the app-state changes
export class AutoRefreshingComponent extends React.Component {
  constructor(props) {
    super(props)
    this.state = this.computeState(props)
    this.refreshState = () => { this.setState(this.computeState(this.props)) }
  }
  componentDidMount() {
    app.on('update:all', this.refreshState) // re-render on app state updates
  }
  componentWillReceiveProps(newProps) {
    this.refreshState(newProps)
  }
  componentWillUnmount() {
    app.removeListener('update:all', this.refreshState)    
  }
  computeState(props) {
    // should be overwritten by sublcass
  }
}