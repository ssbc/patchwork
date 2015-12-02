'use babel'
import React from 'react'

export default class SteppedProgressBar extends React.Component {
  render() {
    return <ul className="stepped-progress-bar">
      { this.props.labels.map((label, i) => {
        return <li key={i} className={(i <= this.props.current) ? 'active' : ''} onClick={()=>this.props.onClick(i)}>{label}</li>
      }) }
    </ul>
  }
}