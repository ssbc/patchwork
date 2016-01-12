'use babel'
import React from 'react'
import { rainbow } from '../index'
import ImageSelector from '../form-elements/image-selector'
import app from '../../lib/app'

const OPTIONS = [
  { src: 'img/feed-representation.png', label: 'Feeds, like on Facebook', value: 0 },
  { src: 'img/inbox-representation.png', label: 'Inboxes, like on Email', value: 1 },
]

export default class ViewMode extends React.Component {
  constructor(props) {
    super(props)
    this.state = { choice: 0 }
  }

  componentDidMount() {
    this.props.setIsReady(true)
    this.props.setIsValid(true)
  }

  onSelect(option) {
    this.setState({ choice: option.value })
  }

  submit(cb) {
    localStorage.msgList = JSON.stringify({ currentMsgView: this.state.choice })
    app.emit('ui:set-view-mode', this.state.choice) // send this so the newsfeed (which should be open right now) can update
    cb()
  }

  render() {
    return <div>
      <h1>Choose your View</h1>
      <h2>Which do you prefer?</h2>
      <ImageSelector options={OPTIONS} value={this.state.choice} onSelect={this.onSelect.bind(this)} />
      <h3 style={{color:'gray'}}>You can change this later.</h3>
    </div>
  }
}