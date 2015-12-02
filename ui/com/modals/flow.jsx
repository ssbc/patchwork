'use babel'
import React from 'react'
import SteppedProgressBar from '../stepped-progress-bar'

export default class ModalFlow extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      step: 0,
      isReady: true,
      canProgress: false,
      helpText: false,
      nextText: undefined
    }
  }

  renderProgressBar() {
    return <SteppedProgressBar current={this.state.step} labels={this.steps.map(s => s.label)} onClick={this.onProgressClick.bind(this)} />
  }

  renderCurrentStep() {
    return this.steps[this.state.step].render()
  }

  gotoStep(step) {
    this.setState({ step: step })
  }

  gotoNextStep() {
    this.gotoStep(this.state.step + 1)
  }

  onProgressClick(step) {
    if (step < this.state.step)
      this.gotoStep(step)
  }

  onNextClick() {
    var next = this.steps[this.state.step].onSubmit || this.gotoNextStep.bind(this)
    next()
  }

  render() {
    if (!this.props.isOpen)
      return <span/>
    
    var nextCls = ['btn']
    if (!this.state.canProgress)
      nextCls.push('disabled')
    else if (this.state.isReady)
      nextCls.push('highlighted')

    return <div className="modal modal-flow">
      <div className="modal-inner">
        <div className="modal-content">{ this.renderCurrentStep() }</div>
        { this.state.helpText ? <div className="modal-helptext">{this.state.helpText}</div> : '' }
        <div className="modal-ctrls">
          { this.renderProgressBar() }
          <div className="next">
            <button disabled={!this.state.canProgress} className={nextCls.join(' ')} onClick={this.onNextClick.bind(this)}>
              {this.state.nextText||'Next'} <i className="fa fa-angle-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  }
}