'use babel'
import React from 'react'
import pull from 'pull-stream'
import app from '../lib/app'
import u from '../lib/util'
import social from '../lib/social-graph'
import { UserLink, NiceDate, VerticalFilledContainer } from '../com/index'
import { PromptModalBtn, InviteModalBtn } from '../com/modals'

class Peer extends React.Component {
  render() {
    let peer = this.props.peer

    // status: connection progress or last-connect info
    let status = ''
    if (peer.connected) {
      if (!peer.progress)
        status = <div className="light">Syncing</div>
      else if (peer.progress.sync || peer.progress.total === 0)
        status = <div className="light">Syncing</div>
      else
        status = <div className="light"><progress value={peer.progress.current / peer.progress.total} /></div>
    } else if (peer.time) {
      if (peer.time.connect > peer.time.attempt)
        status = <div className="light">Synced at <NiceDate ts={peer.time.connect} /></div>
      else if (peer.time.attempt) {
        status = <div className="light">Connect failed at <NiceDate ts={peer.time.attempt} /></div>
      }
    }

    return <div className={'peer flex '+((peer.connected)?'.connected':'')}>
      <div className="flex-fill">
        <div><UserLink id={peer.key} /> { social.follows(peer.key, app.user.id) ? <span className="light">Follows You</span> : '' }</div>
        <div><small>{peer.host}:{peer.port}:{peer.key}</small></div>
      </div>
      {status}
    </div>
  }
}

export default class Sync extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      peers: [],
      stats: {}
    }
  }

  componentDidMount() {
    // fetch peers list
    app.ssb.gossip.peers((err, peers) => {
      if (err) return app.minorIssue('Failed to fetch peers list', err, 'This happened while loading the sync page')
      peers = peers || []
      this.setState({
        peers: peers,
        stats: u.getPubStats(peers)
      })
    })

    // setup event streams
    pull((this.gossipChangeStream = app.ssb.gossip.changes()), pull.drain(this.onGossipEvent.bind(this)))
    pull((this.replicateChangeStream = app.ssb.replicate.changes()), pull.drain(this.onReplicationEvent.bind(this)))
  }
  componentWillUnmount() {
    // abort streams
    this.gossipChangeStream(true, ()=>{})
    this.replicateChangeStream(true, ()=>{})
  }

  onGossipEvent(e) {
    // update the peers
    let i, peers = this.state.peers
    for (i=0; i < peers.length; i++) {
      if (peers[i].key == e.peer.key && peers[i].host == e.peer.host && peers[i].port == e.peer.port) {
        peers[i] = e.peer
        break
      }
    }
    if (i == peers.length)
      peers.push(e.peer)
    this.setState({ peers: peers, stats: u.getPubStats(peers) })
  }
  onReplicationEvent(e) {
    // update the peers
    let progress = { feeds: e.feeds, sync: e.sync, current: e.progress, total: e.total }
    let i, peers = this.state.peers
    for (i=0; i < peers.length; i++) {
      if (peers[i].key == e.peerid) {
        peers[i].progress = progress
        break
      }
    }

    // update observables
    if (i !== peers.length)
      this.setState({ peers: peers })
  }
  onUseInvite() {
    this.props.history.pushState(null, '/')
  }
  onAddNode(addr) {
    app.ssb.gossip.connect(addr, function (err) {
      if (err)
        app.issue('Failed to connect to '+addr, err)
    })
  }

  render() {
    let stats = this.state.stats
    let addNodeLabel = (<span><i className="fa fa-plus"/> Add Address</span>)
    let warning = ''
    if (stats.membersof === 0)
      warning = <div className="warning"><i className="fa fa-exclamation-circle" /> You need to join a pub to communicate across the Internet.</div>
    else if (stats.active === 0 && stats.untried === 0)
      warning = <div className="warning"><i className="fa fa-exclamation-circle" /> None of your pubs are responding. Are you connected to the Internet?</div>

    return <VerticalFilledContainer id="sync">
      <div className="header">
        <div>
          <InviteModalBtn className="btn" onUseInvite={this.onUseInvite.bind(this)} />{' '}
          <PromptModalBtn className="btn" onSubmit={this.onAddNode.bind(this)} submitLabel="Connect" btnLabel={addNodeLabel} placeholder="host:port@key"><p>Nodes full address:</p></PromptModalBtn>
        </div>
        {warning}
      </div>
      {this.state.peers.map((peer, i) => <Peer key={'peer'+i} peer={peer} />)}
    </VerticalFilledContainer>
  }
}