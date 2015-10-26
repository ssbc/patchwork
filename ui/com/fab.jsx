'use babel'
import React from 'react'

export default class FAB extends React.Component {
  render() {
    return <div className="fab" onClick={this.props.onClick}>
      <a className="primary" data-label={this.props.label||'Compose'}><i className={'fa fa-'+(this.props.icon||'pencil')} /></a>
    </div>
  }
}