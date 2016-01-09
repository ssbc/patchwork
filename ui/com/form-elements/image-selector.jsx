'use babel'
import React from 'react'
import cls from 'classnames'

export default class ImageSelector extends React.Component {
  render() {
    return <div className="image-selector">
      { this.props.options.map(o => {
        const onClick = () => this.props.onSelect(o)
        return <div className={ cls({ option: true, selected: o.value === this.props.value }) } onClick={onClick}>
          { o.label ? <div>{o.label}</div> : '' }
          <img src={o.src} />
        </div>
      }) }
    </div>
  }
}