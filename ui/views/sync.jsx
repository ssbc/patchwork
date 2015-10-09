'use babel'
import React from 'react'
import pull from 'pull-stream'
import app from '../lib/app'
import u from '../lib/util'
import social from '../lib/social-graph'
import { UserLink, verticalFilled } from '../com/index'
import { UserHexagon } from '../com/hexagons'

class Peer extends React.Component {
  onSync() {
    app.ssb.gossip.connect({ host: this.props.peer.host, port: this.props.peer.port, key: this.props.peer.key }, ()=>{})
  }

  render() {
    let peer = this.props.peer

    // sort out the last time of connection
    let lastConnect = ''
    if (peer.time) {
      if (peer.time.connect > peer.time.attempt)
        lastConnect = <p>Synced {new Date(peer.time.connect).toLocaleString()}</p>
      else if (peer.time.attempt) {
        lastConnect = <p>Attempted (but failed) to connect at {new Date(peer.time.attempt).toLocaleString()}</p>
      }
    }

    // sort out progress
    let progress = 0, progressLabel = ''
    if (peer.connected) {
      if (!peer.progress)
        progressLabel = 'Connecting...'
      else if (peer.progress.sync || peer.progress.total === 0) {
        progress = 1
        progressLabel = 'Live-streaming'
      }
      else {
        progress = (peer.progress.current / peer.progress.total)
        progressLabel = 'Syncing...'
      }
    }

    return <div className={'peer '+((peer.connected)?'.connected':'')}>
      <UserHexagon id={peer.key} />
      <h3>
        <UserLink id={peer.key} />
        {' '}
        { (peer.connected) ?
          <em>Syncing</em> :
          <a onClick={this.onSync.bind(this)}>Sync</a> }
        {' '}
        { social.follows(peer.key, app.user.id) ? <small>Follows You</small> : '' }
        <br/>
        <small>{peer.host}:{peer.port}:{peer.key}</small>
      </h3>
      <p><progress value={progress} />{progressLabel}</p>
      {lastConnect}
    </div>
  }
}

class Sync extends React.Component {
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
      if (err) return console.error(err) // :TODO: inform user
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
    // :TODO:
  }
  onAddNode() {
    // :TODO:
  }

  render() {
    let stats = this.state.stats

    let warning = ''
    if (stats.membersof === 0)
      warning = <p>You need to join a pub if you want to communicate across the Internet!</p>
    else if (stats.active === 0 && stats.untried === 0)
      warning = <p>None of your pubs are responding! Are you connected to the Internet?</p>

    return <div style={{height: this.props.height, overflow: 'auto'}}>
      <div>
        <h1>{'You\'re followed by ' + stats.membersof} public node{stats.membersof==1?'':'s'} <small>{stats.active} connected</small></h1>
        {warning}
        <p><a onClick={this.onUseInvite.bind(this)}>Join a Pub</a></p>
      </div>
      <p>Mesh Network <a onClick={this.onAddNode.bind(this)}>Add Node...</a></p>
      {this.state.peers.map((peer, i) => <Peer key={'peer'+i} peer={peer} />)}
    </div>
  }
}
export default verticalFilled(Sync)