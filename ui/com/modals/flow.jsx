'use babel'
import React from 'react'
import SteppedProgressBar from '../stepped-progress-bar'

export default class ModalFlow extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      step: false,
      isReady: true,
      canProgress: false,
      helpText: false,
      nextText: undefined
    }
  }

  componentDidMount() {
    // go to first step
    this.gotoStep(1)
  }

  gotoStep(step) {
    this.setState({
      step: step,
      helpText: false,
      isReady: true,
      canProgress: false
    })
  }

  gotoNextStep() {
    this.gotoStep(this.state.step + 1)
  }

  getStepCom() {
    if (this.state.step === false)
      return false
    return this.stepComs[this.state.step]
  }

  onNextClick() {
    const step = this.refs.step
    const next = (step && step.submit) || this.gotoNextStep.bind(this)
    next()
  }

  render() {
    var StepCom = this.getStepCom()
    if (!this.props.isOpen || !StepCom)
      return <span/>
    
    var nextCls = ['btn']
    if (!this.state.canProgress)
      nextCls.push('disabled')
    else if (this.state.isReady)
      nextCls.push('highlighted')

    const setHelpText = helpText => { this.setState({ helpText: helpText }) }
    const setCanProgress = canProgress => { this.setState({ canProgress: canProgress }) }
    const setIsReady = isReady => { this.setState({ isReady: isReady }) }

    return <div className="modal modal-flow">
      <div className="modal-inner">
        <div className="modal-content">
          <StepCom ref="step" setIsReady={setIsReady} setCanProgress={setCanProgress} setHelpText={setHelpText} gotoNextStep={this.gotoNextStep.bind(this)} />
        </div>
        { this.state.helpText ? <div className="modal-helptext">{this.state.helpText}</div> : '' }
        <div className="modal-ctrls">
          <SteppedProgressBar current={this.state.step} labels={this.stepLabels} />
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