'use babel'
import React from 'react'
import cls from 'classnames'

function mkarray(n) {
  var arr = []
  arr.length = n
  for (var i=0; i < n; i++)
    arr[i] = false
  return arr
}

export default class SteppedProgressBar extends React.Component {
  render() {
    const n = this.props.num || this.props.labels.length
    const hasLabels = !!this.props.labels
    const labels = this.props.labels || mkarray(n)
    return <ul className={'stepped-progress-bar n'+n+(this.props.canGoBack?' can-go-back':'')+(hasLabels?'':' no-labels')}>
      { labels.map((label, i) => {
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
