'use babel'
import React from 'react'

export default class InfoPlaque extends React.Component {
  render() {
    return <div className="info-plaque" data-label={this.props.label}>
      { this.props.children }
    </div>
  }
}