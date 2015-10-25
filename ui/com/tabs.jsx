'use babel'
import React from 'react'

class Tab extends React.Component {
  onClick() {
    this.props.onClick(this.props.option)
  }
  render() {
    return <a className={this.props.selected?'selected':''} onClick={this.onClick.bind(this)}>{this.props.option.label}</a>
  }
}

export default class Tabs extends React.Component {
  render() {
    return <div className="tabs">
      {this.props.options.map((opt,i) => <Tab key={i} option={opt} selected={opt === this.props.selected} onClick={this.props.onSelect} />)}
    </div>
  }
}