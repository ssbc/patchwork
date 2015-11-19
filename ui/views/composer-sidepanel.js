'use babel'
import React from 'react'
import Composer from '../com/composer'
import app from '../lib/app'

export default class ComposerSidePanel extends React.Component {
  onSend() {
    app.isComposerOpen = false
    app.emit('update:isComposerOpen', app.isComposerOpen)
  }
  render() {
    return <div id="rightpane" className={this.props.isOpen?'open':''}>
      <div className="inner">
        <Composer onSend={this.onSend} />
      </div>
    </div>
  }
}