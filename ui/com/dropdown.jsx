'use babel'
import React from 'react'
import ClipboardBtn from 'react-clipboard.js'

export class Dropdown extends React.Component {
  render() {
    const onSelect = (item, i) => e => {
      e.stopPropagation()
      item.selectFunction ? item.selectFunction() : this.props.onSelect(item.value, i)
    }
    const span = (item) => <span><i className={"fa "+item.faClass} /> {item.label}</span>

    return <span className={'dropdown' + (this.props.open?' open':' closed') + (this.props.right?' right':'')}>
      <ul onMouseLeave={this.props.onClose}>
        {
          this.props.items.map((item,i) => {
            return (item.value === "copy-link") ?
              <ClipboardBtn component='li' data-clipboard-text={item.id} key={i}>{span(item)}</ClipboardBtn> :
              <li key={i} onClick={item.onClick}>{span(item)}</li>
          })
        }
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
      {
        (this.state.open) ? 
          <Dropdown items={this.props.items} right={this.props.right} open={this.state.open} onClose={this.onClose.bind(this)} /> :
          ''
      }
      {this.props.children}
      <i className="fa fa-ellipsis-h" />
    </a>
  }
}
