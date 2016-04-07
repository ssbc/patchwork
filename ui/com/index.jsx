'use babel'
import React from 'react'
import app from '../lib/app'
import social from '../lib/social-graph'
import u from '../lib/util'

// parent class for components which should persist their state to localstorage
// - subclasses must call super(props, storageId), where `storageId` is the localStorage key
// - subclasses should provide defaultState to set which values are persisted, and give initial values
export class LocalStoragePersistedComponent extends React.Component {
  constructor(props, storageId, defaultState) {
    super(props)
    
    // load state from local storage
    this.storageId = storageId
    try { this.state = JSON.parse(localStorage[this.storageId]) }
    catch(e) { this.state = {} }

    // write any missing state props from default state
    this.persistKeys = Object.keys(defaultState)
    for (var k in defaultState) {
      if (!(k in this.state))
        this.state[k] = defaultState[k]
    }
  }

  setState(obj, cb) {
    // override to persist to local storage
    super.setState(obj, (prevState, currentProps) => {
      // extract only the persisted keys
      var saveState = {}
      this.persistKeys.forEach(k => saveState[k] = this.state[k])

      // store
      localStorage[this.storageId] = JSON.stringify(saveState)
      cb && cb(prevState, currentProps)
    })
  }
}
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