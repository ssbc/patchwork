'use babel'
import React from 'react'
import TopNav from '../com/topnav'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import MsgList from 'patchkit-msg-list'
import Thread from 'patchkit-flat-msg-thread'
import Card from 'patchkit-msg-view/card'
import app from '../lib/app'
import t from 'patchwork-translations'

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

  onToggleWatch(channel) {
    app.ssb.patchwork.toggleChannelWatched(channel, err => {
      if (err)
        app.issue(t('error.watchChannel'), err)
    })
  }

  render() {
    const channel = this.props.params.channel
    const channelData = findChannelData(channel)
    const ThisRightNav = props => {
      if (channel) {
        const watched = (channelData && channelData.watched)
        const watchHint = watched ? t('UnwatchChannelHint') : t('WatchChannelHint')
        return <RightNav>
          <hr className="labeled" data-label={t('channel')} />
          <a className="btn hint--top-left" data-hint={watchHint} onClick={this.onToggleWatch.bind(this, channel)}>
            <i className={'fa fa-eye'+(watched?'-slash':'')} /> { t(watched ? 'UnwatchChannel' : 'WatchChannel') }
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
        batchLoadAmt={5}
        TopNav={TopNav} topNavProps={{ composer: true, composerProps: { isPublic: true, channel: channel } }}
        LeftNav={LeftNav} leftNavProps={{location: this.props.location}}
        RightNav={ThisRightNav}
        ListItem={Card} listItemProps={{ listView: true }}
        Thread={Thread} threadProps={{ suggestOptions: app.suggestOptions, channels: app.channels }}
        live={{ gt: [Date.now(), null] }}
        emptyMsg={(channel) ? t('NoPosts', {channel}) : t('EmptyFeed')}
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