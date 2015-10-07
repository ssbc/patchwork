'use babel'
import React from 'react'
import Summary from './summary'
import MsgView from '../msg-view'

export default class MsgList extends React.Component {
  constructor(props) {
    super(props)
    this.state = { selected: null }
  }

  onSelectMsg(mid) {
    this.setState({ selected: mid })
  }

  render() {
    return <div className="msg-list">
      <div className="msg-list-items">
        <Summary mid="1" onSelect={this.onSelectMsg.bind(this)} selected={this.state.selected == 1} />
        <Summary mid="2" onSelect={this.onSelectMsg.bind(this)} selected={this.state.selected == 2} />
        <Summary mid="3" onSelect={this.onSelectMsg.bind(this)} selected={this.state.selected == 3} />
        <Summary mid="4" onSelect={this.onSelectMsg.bind(this)} selected={this.state.selected == 4} />
      </div>
      <div className="msg-list-view">
        {this.state.selected ? <MsgView mid={this.state.selected} /> : undefined}
      </div>
    </div>
  }
}