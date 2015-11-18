'use babel'
import React from 'react'
import Thread from '../com/msg-thread'
import mlib from 'ssb-msgs'
import app from '../lib/app'
import u from '../lib/util'

export default class Msg extends React.Component {
  render() {
    return <div id="msg">
      <Thread id={this.props.params.id} live />
    </div>
  }
}