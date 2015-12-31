'use babel'
import React from 'react'

export class Dropdown extends React.Component {
  onSelect(v) {
  }
  render() {
    const onSelect = (v, i) => e => {
      e.stopPropagation()
      this.props.onSelect(v, i)
    }
    return <span className={'dropdown' + (this.props.open?' open':' closed') + (this.props.right?' right':'')}>
      <ul onMouseLeave={this.props.onClose}>
        { this.props.items.map((item,i) => <li key={i} onClick={onSelect(item.value, i)}>{item.label}</li>) }
      </ul>
    </span>
  }
}

export default class DropdownBtn extends React.Component {
  constructor(props) {
    super(props)
    this.state = { open: false }
  }
  onOpen() {
    this.setState({ open: true })
  }
  onClose() {
    this.setState({ open: false })
  }
  onSelect(v, index) {
    this.setState({ open: false })
    this.props.onSelect(v, index)
  }
  render() {
    return <a className={(this.props.className||'') + ' dropdown-btn' + (this.props.right ? ' right':'')} onClick={this.onOpen.bind(this)}>
      <Dropdown items={this.props.items} right={this.props.right} open={this.state.open} onClose={this.onClose.bind(this)} onSelect={this.onSelect.bind(this)} />
      {this.props.children}
    </a>
  }
}