'use babel'
import React from 'react'
import LeftNav from '../com/leftnav'
import Composer from '../com/composer'
import app from '../lib/app'

export default class ComposerView extends React.Component {
  onSend(msg) {
    app.history.pushState(null, '/msg/'+encodeURIComponent(msg.key))
  }
  render() {
    return <div id="composer" className="flex">
      <LeftNav/>
      <div className="flex-fill">
        <Composer verticalFilled onSend={this.onSend} />
      </div>
    </div>
  }
}