'use babel'
import React from 'react'

export class Dropdown extends React.Component {
  render() {
    const onSelect = (item, i) => e => {
      this.props.onSelect && this.props.onSelect(item.value, i)
      item.onSelect && item.onSelect()
    }

    return <span className={'dropdown' + (this.props.open?' open':' closed') + (this.props.right?' right':'')}>
      <ul onMouseLeave={this.props.onClose}>
        { this.props.items.map((item,i) => {
          const onClick = onSelect(item, i)
          if (item.Com) 
            return <item.Com key={i} onClick={onClick} />
          return <li key={i} onClick={onClick}>{item.label}</li>
        }) }
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
    this.props.onSelect && this.props.onSelect(v, index)
  }
  render() {
    return <span className={(this.props.className||'') + ' dropdown-btn' + (this.props.right ? ' right':'')}>
      <a onClick={this.onOpen.bind(this)}>
        {this.props.children}
      </a>
      <Dropdown items={this.props.items} right={this.props.right} open={this.state.open} onClose={this.onClose.bind(this)} onSelect={this.onSelect.bind(this)} />
    </span>
  }
}
