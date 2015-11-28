'use babel'
import React from 'react'

class Tab extends React.Component {
  onClick() {
    this.props.onClick(this.props.option)
  }
  render() {
    const icon = (this.props.useIcon) ? <i className={'fa fa-'+(this.props.selected?'check-circle-o':'circle-thin')} /> : ''
    let cls = []
    if (this.props.selected) cls.push('selected')
    if (this.props.fill) cls.push('flex-fill text-center')
    if (this.props.option.className) cls.push(this.props.option.className)
    return <a className={cls.join(' ')} onClick={this.onClick.bind(this)}>
      {icon} {this.props.option.label}
    </a>
  }
}

export default class Tabs extends React.Component {
  render() {
    return <div className={'tabs'+(this.props.vertical?' vertical':'')+(this.props.fill?' flex':'')}>
      {this.props.options.map((opt,i) => <Tab key={i} useIcon={!!this.props.vertical} fill={this.props.fill} option={opt} selected={opt === this.props.selected} onClick={this.props.onSelect} />)}
    </div>
  }
}