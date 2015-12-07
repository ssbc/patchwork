'use babel'
import React from 'react'

export default class FAB extends React.Component {
  render() {
    return <div className={'fab '+(this.props.className||'')} onClick={this.props.onClick}>
      <a className="primary" data-label={this.props.label}>
        <span className="inner">{this.props.children} {this.props.icon ? <i className={'fa fa-'+this.props.icon} /> : ''}</span>
      </a>
    </div>
  }
}