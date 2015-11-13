'use babel'
import React from 'react'
import Composer from '../com/composer'

export default class ComposerSidePanel extends React.Component {
  render() {
    return <div id="rightpane" className={this.props.isOpen?'open':''}>
      <div className="inner">
        <Composer />
      </div>
    </div>
  }
}