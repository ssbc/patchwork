'use babel'
import React from 'react'
import SteppedProgressBar from '../stepped-progress-bar'
import app from '../../lib/app'

export default class ModalFlow extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      step: false,
      isReady: true,
      isValid: false,
      helpText: false
    }
  }

  componentDidMount() {
    // go to first step
    this.gotoStep(0)
  }

  gotoStep(step, cb) {
    this.setState({
      step: step,
      helpText: false,
      isReady: true,
      isValid: false
    }, cb)
  }

  gotoNextStep() {
    this.gotoStep(this.state.step + 1, () => {
      if (!this.getStepCom())
        this.props.onClose && this.props.onClose()
    })
  }

  getStepCom() {
    if (this.state.step === false)
      return false
    return this.props.Forms[this.state.step]
  }

  onNextClick() {
    const step = this.refs.step
    const next = (step && step.submit.bind(step)) || this.gotoNextStep.bind(this)
    next(err => {
      if (err)
        app.issue('There was an error', err)
      else
        this.gotoNextStep()
    })
  }

  render() {
    var StepCom = this.getStepCom()
    if (!this.props.isOpen || !StepCom)
      return <span/>

    const nextText = (this.state.step >= (this.props.Forms.length - 1)) ? 'Finish' : 'Next'
    
    var nextCls = ['btn']
    if (!this.state.isValid)
      nextCls.push('disabled')
    else if (this.state.isReady)
      nextCls.push('highlighted')

    const setHelpText = helpText => { this.setState({ helpText: helpText }) }
    const setIsValid = isValid => { this.setState({ isValid: isValid }) }
    const setIsReady = isReady => { this.setState({ isReady: isReady }) }

    return <div className={'modal modal-flow '+(this.props.className||'')}>
      <div className="modal-inner">
        <div className="modal-content">
          <StepCom ref="step" setIsReady={setIsReady} setIsValid={setIsValid} setHelpText={setHelpText} gotoNextStep={this.gotoNextStep.bind(this)} />
        </div>
        { this.state.helpText ? <div className="modal-helptext">{this.state.helpText}</div> : '' }
        <div className="modal-ctrls">
          <SteppedProgressBar current={this.state.step} labels={this.props.labels} />
          <div className="next">
            <button disabled={!this.state.isValid} className={nextCls.join(' ')} onClick={this.onNextClick.bind(this)}>
              {nextText} <i className="fa fa-angle-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  }
}