'use babel'
import React from 'react'
import { rainbow } from '../index'
import ImageSelector from '../form-elements/image-selector'
import app from '../../lib/app'

const OPTIONS = [
  { src: 'img/feed-representation.png', label: 'Feeds, like on Facebook', value: 'feed' },
  { src: 'img/inbox-representation.png', label: 'Inboxes, like on Email', value: 'inbox' },
]

export default class ViewMode extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      choice: 'feed'
    }
  }

  componentDidMount() {
    this.props.setIsReady(true)
    this.props.setIsValid(true)
  }

  onSelect(option) {
    this.setState({ choice: option.value })
  }

  submit(cb) {
    // TODO
    cb()
  }

  render() {
    return <div>
      <h1>Choose your {rainbow('Interface')}</h1>
      <h2>Which do you prefer?</h2>
      <ImageSelector options={OPTIONS} value={this.state.choice} onSelect={this.onSelect.bind(this)} />
      <h3 style={{color:'gray'}}>You can change this later.</h3>
    </div>
  }
}