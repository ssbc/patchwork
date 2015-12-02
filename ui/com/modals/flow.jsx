'use babel'
import React from 'react'
import SteppedProgressBar from '../stepped-progress-bar'

export default class ModalFlow extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      step: 0,
      isReady: true,
      helpText: false,
      nextText: undefined
    }
  }

  renderProgressBar() {
    return <SteppedProgressBar current={this.state.step} labels={this.stepLabels} onClick={this.onProgressClick.bind(this)} />
  }

  renderCurrentStep() {
    // should be overwritten by subclass
    return ''
  }

  gotoStep(step) {
    this.setState({ step: step })
  }

  onProgressClick(step) {
    if (step < this.state.step)
      this.gotoStep(step)
  }

  onNext() {
    this.gotoStep(this.state.step + 1)
  }

  render() {
    if (!this.props.isOpen)
      return <span/>
    return <div className="modal modal-flow">
      <div className="modal-inner">
        <div className="modal-content">{ this.renderCurrentStep() }</div>
        { this.state.helpText ? <div className="modal-helptext">{this.state.helpText}</div> : '' }
        <div className="modal-ctrls">
          { this.renderProgressBar() }
          <div className="next"><a className={'btn'+(this.state.isReady?' highlighted':'')} onClick={this.onNext.bind(this)}>
            {this.state.nextText||'Next'} <i className="fa fa-angle-right" />
          </a></div>
        </div>
      </div>
    </div>
  }
}