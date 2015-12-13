'use babel'
import React from 'react'
import { VerticalFilledContainer } from '../com'
import { ALL_CHANNELS, ChannelList } from '../com/channel-list'
import app from '../lib/app'

export default class Channels extends React.Component {
  constructor(props) {
    super(props)
    this.state = { channels: app.channels||[] }
    app.on('update:channels', () => this.setState({ channels: app.channels }))
  }
  onSelect(channel) {
    if (!channel)
      app.history.pushState(null, '/')
    else
      app.history.pushState(null, '/channel/' + encodeURIComponent(channel.name))
  }
  render() {
    const path = this.props.location.pathname
    const selectedChannel = (path.indexOf('/channel/') === 0)
      ? decodeURIComponent(path.slice('/channel/'.length))
      : path === '/'
      ? ALL_CHANNELS
      : false

    return <VerticalFilledContainer id="data">
      <ChannelList channels={app.channels} selected={selectedChannel} onSelect={this.onSelect.bind(this)} />
    </VerticalFilledContainer>
  }
}