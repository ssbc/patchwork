'use babel'
import React from 'react'
import cls from 'classNames'

export default class SteppedProgressBar extends React.Component {
  render() {
    var n = this.props.labels.length
    return <ul className={'stepped-progress-bar n'+n+(this.props.canGoBack?' can-go-back':'')}>
      { this.props.labels.map((label, i) => {
        const onClick = (this.props.canGoBack) ? (()=>this.props.onClick(i)) : undefined
        const className = cls({
          active: (i <= this.props.current),
          current: (i == this.props.current)
        })
        return <li key={i} className={className} onClick={onClick}>{label}</li>
      }) }
    </ul>
  }
}