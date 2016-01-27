'use babel'
import React from 'react'

export default class ModalSingle extends React.Component {
  constructor(props) {
    super(props)
    this.com = null
    this.state = {
      isReady: true,
      isValid: false,
      helpText: false
    }
  }

  onCancelClick() {
    this.props.onClose && this.props.onClose(false, false)
  }

  onNextClick() {
    if (!this.state.isValid)
      return
    this.refs.form.submit(err => {
      if (err)
        this.issue('An Error Occurred', err)
      this.props.onClose && this.props.onClose(err, true)
    })
  }

  render() {
    const nextLabel = this.props.nextLabel || 'Finish'
    const cancelLabel = this.props.cancelLabel || 'Cancel'
    var Form = this.props.Form
    if (!this.props.isOpen || !Form)
      return <span/>
   
    var nextCls = ['btn']
    if (!this.state.isValid)
      nextCls.push('disabled')
    else if (this.state.isReady)
      nextCls.push('highlighted')

    const setHelpText = helpText => { this.setState({ helpText: helpText }) }
    const setIsValid = isValid => { this.setState({ isValid: isValid }) }
    const setIsReady = isReady => { this.setState({ isReady: isReady }) }

    return <div className={'modal modal-single '+(this.props.className||'')}>
      <div className="modal-inner">
        <div className="modal-content">
          <Form ref="form" setIsReady={setIsReady} setIsValid={setIsValid} setHelpText={setHelpText} {...this.props.formProps} />
        </div>
        { this.state.helpText ? <div className="modal-helptext">{this.state.helpText}</div> : '' }
        <div className="modal-ctrls">
          <div className="cancel">
            <button className="btn" onClick={this.onCancelClick.bind(this)}>
              <i className="fa fa-remove" /> {cancelLabel}
            </button>
          </div>
          <div className="next">
            <button disabled={!this.state.isValid} className={nextCls.join(' ')} onClick={this.onNextClick.bind(this)}>
              {nextLabel} <i className="fa fa-angle-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  }
}