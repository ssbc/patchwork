'use babel'
import React from 'react'

export default class ModalPopup extends React.Component {
  render() {
    const closeLabel = this.props.closeLabel || 'Close'
    const cancelLabel = this.props.cancelLabel || 'Cancel'
    const Content = this.props.Content
    if (!this.props.isOpen || !Content)
      return <span/>

    return <div className={'modal modal-single '+(this.props.className||'')}>
      <div className="modal-inner">
        <div className="modal-content">
          <Content {...this.props.contentProps} />
        </div>
        { this.props.helpText ? <div className="modal-helptext">{this.props.helpText}</div> : '' }
        <div className="modal-ctrls">
          <div className="cancel">
          </div>
          <div className="next">
            <button className="btn highlighted" onClick={this.props.onClose}>
              {closeLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  }
}