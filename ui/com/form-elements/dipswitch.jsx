'use babel'
import React from 'react'

export default class Dipswitch extends React.Component {
  constructor(props) {
    super(props)
  }
  
  onClick() {
    if (this.props.onToggle)
      this.props.onToggle(!this.props.checked)
  }

  render () {
    return <a onClick={this.onClick.bind(this)} className={`dipswitch ${this.props.checked?'checked':''} ${this.props.className||''}`}>
      <i className={`fa fa-toggle-${this.props.checked?'on':'off'}`} /> {this.props.label||''}
    </a>
  }
}