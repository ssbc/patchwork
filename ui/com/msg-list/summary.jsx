'use babel'
import React from 'react'
import { UserLink } from '../index'
import { Inline as Content } from '../msg-content'

export default class Summary extends React.Component {

  onClick() {
    this.props.onSelect(this.props.msg)
  }

  render() {
    return <div className={'msg-list-item summary'+(this.props.selected ? ' selected' : '')} onClick={this.onClick.bind(this)}>
      <div className="header">
        <div><UserLink /></div>
        <div>Oct 13</div>
      </div>
      <div className="body"><Content msg={this.props.msg} /></div>
    </div>
  }
}