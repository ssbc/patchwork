'use babel'
import React from 'react'
import cls from 'classnames'

export default class InputPlaque extends React.Component {
  render() {
    return <div className={cls({ 'input-plaque': true, 'has-btn': !!this.props.btn })} data-label={this.props.label}>
      <input placeholder={this.props.placeholder} readOnly={this.props.readOnly} value={this.props.value} />
      { this.props.btn
        ? <a>{this.props.btn}</a>
        : '' }
    </div>
  }
}