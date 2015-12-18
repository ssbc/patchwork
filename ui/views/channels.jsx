'use babel'
import React from 'react'
import { Link } from 'react-router'
import { VerticalFilledContainer } from '../com'
import { ChannelList } from '../com/channel-list'
import app from '../lib/app'

export default class Channels extends React.Component {
  constructor(props) {
    super(props)
    this.state = { channels: app.channels||[] }
    app.on('update:channels', (this.onUpdateChannels = () => this.setState({ channels: app.channels })))
  }
  componentWillUnmount() {
    app.removeListener('update:channels', this.onUpdateChannels)
  }
  onSelect(channel) {
    app.history.pushState(null, '/newsfeed/channel/' + encodeURIComponent(channel.name))
  }
  render() {
    const path = this.props.location.pathname

    return <VerticalFilledContainer id="channels">
      <p><Link to="/"><i className="fa fa-hand-o-left" /> Back to feed</Link></p>
      <ChannelList channels={app.channels} onSelect={this.onSelect.bind(this)} />
    </VerticalFilledContainer>
  }
}