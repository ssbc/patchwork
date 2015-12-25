'use babel'
import React from 'react'

export default class SteppedProgressBar extends React.Component {
  render() {
    var n = this.props.labels.length
    return <ul className={'stepped-progress-bar n'+n+(this.props.canGoBack?' can-go-back':'')}>
      { this.props.labels.map((label, i) => {
        const onClick = (this.props.canGoBack) ? (()=>this.props.onClick(i)) : undefined
        return <li key={i} className={(i <= this.props.current) ? 'active' : ''} onClick={onClick}>{label}</li>
      }) }
    </ul>
  }
}