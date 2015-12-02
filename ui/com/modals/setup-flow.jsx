'use babel'
import React from 'react'
import ModalFlow from './flow'

export default class SetupFlow extends ModalFlow {
  constructor(props) {
    super(props)
    this.stepLabels = ['Profile', 'Nearby', 'Pubs']
  }

  renderCurrentStep() {
    if (this.state.step === 0) {
      return <h1>Welcome to <span className="rainbow">{'Patchwork'.split('').map(c => <span>{c}</span>)}</span></h1>
    }
    return <h1>Step {this.state.step+1} <span className="rainbow">{'TODO'.split('').map(c => <span>{c}</span>)}</span></h1>
  }
}