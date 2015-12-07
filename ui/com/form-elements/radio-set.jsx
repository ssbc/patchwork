'use babel'
import React from 'react'

export default class RadioSet extends React.Component {
  render () {
    return <div className={this.props.className}>
      { this.props.options.map((option, i) => {
        return (
          <label key={'option'+i}>
            <input type="radio"
              name={this.props.group} 
              value={option.value} 
              defaultChecked={option.checked}
              onChange={()=>this.props.onChange(option.value)} />
            {option.label}
          </label>
        )
      }) }
    </div>
  }
}