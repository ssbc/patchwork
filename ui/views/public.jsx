'use babel'
import React from 'react'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from '../com/msg-list'
import Card from '../com/msg-view/card'
import app from '../lib/app'

export default class PublicPosts extends React.Component {
  constructor(props) {
    super(props)
    this.state = { channels: app.channels || [] }

    this.refresh = () => {
      this.setState({ channels: app.channels })
    }
    app.on('update:channels', this.refresh)
  }
  componentWillUnmount() {
    app.removeListener('update:channels', this.refresh)
  }

  onTogglePin(channel) {
    app.ssb.patchwork.toggleChannelPinned(channel, err => {
      if (err)
        app.issue('Failed to pin channel', err)
    })
  }

  onToggleWatch(channel) {
    app.ssb.patchwork.toggleChannelWatched(channel, err => {
      if (err)
        app.issue('Failed to watch channel', err)
    })
  }

  render() {
    const channel = this.props.params.channel
    const channelData = findChannelData(channel)
    const ThisRightNav = props => {
      if (channel) {
        const pinned = (channelData && channelData.pinned)
        const watched = (channelData && channelData.watched)
        const pinHint = pinned ? 'Remove this channel from your lefthand menu.' : 'Add this channel to your lefthand menu (under "Activity Feed").'
        const watchHint = watched ? 'Stop receiving updates to this channel in your inbox.' : 'Receive updates to this channel in your inbox.'
        return <RightNav>
          <hr className="labeled" data-label="channel" />
          <a className="btn hint--top-left" data-hint={pinHint} onClick={this.onTogglePin.bind(this, channel)}>
            <i className="fa fa-thumb-tack" /> { pinned ? 'Unpin' : 'Pin' } channel
          </a>
          <a className="btn hint--top-left" data-hint={watchHint} onClick={this.onToggleWatch.bind(this, channel)}>
            <i className={'fa fa-eye'+(watched?'-slash':'')} /> { watched ? 'Unwatch' : 'Watch' } channel
          </a>
        </RightNav>
      }
      return <RightNav/>
    }

    // msg-list params
    const cursor = msg => {
      if (msg)
        return [msg.ts, false]
    }
    const source = (opts) => {
      if (channel)
        return app.ssb.patchwork.createChannelStream(channel, opts)
      return app.ssb.patchwork.createPublicPostStream(opts)
    }

    // render content
    return <div id="public-posts" key={channel||'*'}>
      <MsgList
        ref="list"
        threads
        dateDividers
        composer composerProps={{ isPublic: true, channel: channel }}
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        RightNav={ThisRightNav}
        ListItem={Card} listItemProps={{ listView: true }}
        live={{ gt: [Date.now(), null] }}
        emptyMsg={(channel) ? ('No posts on "'+channel+'"... yet!') : 'Your feed is empty.'}
        source={source}
        cursor={cursor} />
    </div>
  }
}

function findChannelData(channel) {
  if (!channel)
    return null
  for (var i=0; i < app.channels.length; i++) {
    if (app.channels[i].name === channel)
      return app.channels[i]
  }
}