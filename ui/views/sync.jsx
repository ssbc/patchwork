'use babel'
import React from 'react'
import pull from 'pull-stream'
import ip from 'ip'
import app from '../lib/app'
import u from '../lib/util'
import social from '../lib/social-graph'
import { UserLink, NiceDate, VerticalFilledContainer } from '../com/index'
import { PromptModalBtn, InviteModalBtn } from '../com/modals'

function peerId (peer) {
  return peer.host+':'+peer.port+':'+peer.key
}

function peerSorter (a, b) {
  // prioritize peers that follow the user
  const bBoost = (social.follows(b.key, app.user.id)) ? 1000 : 0
  const aBoost = (social.follows(a.key, app.user.id)) ? 1000 : 0
  // then sort by # of announcers
  return (bBoost + b.announcers.length) - (aBoost + a.announcers.length)
}

//class Peer extends React.Component {
  //render() {
    //let peer = this.props.peer

    //// status: connection progress or last-connect info
    //let status = ''
    //if (peer.connected) {
      //if (!peer.progress)
        //status = <div className="light">Syncing</div>
      //else if (peer.progress.sync || peer.progress.total === 0)
        //status = <div className="light">Syncing</div>
      //else
        //// NOTE: I've not seen this progress working in recent memory
        //status = <div className="light"><progress value={peer.progress.current / peer.progress.total} /></div>
    //} else if (peer.time) {
      //if (peer.time.connect > peer.time.attempt)
        //status = <div className="light">Synced at <NiceDate ts={peer.time.connect} /></div>
      //else if (peer.time.attempt) {
        //status = <div className="light">Connect failed at <NiceDate ts={peer.time.attempt} /></div>
      //}
    //}

    //const isMember = social.follows(peer.key, app.user.id)
    //return <div className={'peer flex'+((peer.connected)?' connected':'')+(isMember?' ismember':'')}>
      //<div className="flex-fill">
        //<div><UserLink id={peer.key} /> { isMember ? <span className="light">Joined</span> : '' }</div>
        //<div><small>{peerId(peer)}</small></div>
      //</div>
      //{status}
    //</div>
  //}
//}

class PeerStatus extends React.Component {
  render() {
    let peer = this.props.peer
    let connectionClass = peer.connected ? ' connected' : ''
    let lastConnected = ''
    if (!peer.connected) {
      if (peer.time && peer.time.connect) {
        lastConnected = <div className="light">Last seen at <NiceDate ts={peer.time.connect} /></div>
      } else {
        lastConnected = '...'
      }
    }

    const isMember = social.follows(peer.key, app.user.id)
    return <div className='peer flex'>
      <div className='flex-fill'>
        { isMember ? <span className={'known-peer-symbol connection-status'+connectionClass}></span> : 
                     <i className={'unknown-peer-symbol fa fa-question-circle connection-status'+connectionClass} /> }
        <UserLink id={peer.key} />
      </div>
      {lastConnected}
    </div>
  }
}

export default class Sync extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      peers: [],
      stats: {},
      isWifiMode: app.isWifiMode
    }
    this.onAppUpdate = () => {
      this.setState({ isWifiMode: app.isWifiMode })
    }
  }

  componentDidMount() {
    // setup app listeners
    app.on('update:all', this.onAppUpdate)
    app.on('update:isWifiMode', this.onAppUpdate)

    // fetch peers list
    app.ssb.gossip.peers((err, peers) => {
      if (err) return app.minorIssue('Failed to fetch peers list', err, 'This happened while loading the sync page')
      peers = peers || []
      peers.sort(peerSorter)
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
    // abort streams and listeners
    app.removeListener('update:all', this.onAppUpdate)
    app.removeListener('update:isWifiMode', this.onAppUpdate)
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
    if (i == peers.length) {
      peers.push(e.peer)
      peers.sort(peerSorter)
    }
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
  
  // TODO needed?
  /*onAddNode(addr) {
    app.ssb.gossip.connect(addr, function (err) {
      if (err)
        app.issue('Failed to connect to '+addr, err)
    })
  }*/

  render() {
    const stats = this.state.stats
    const downloading = Math.max(stats.connected-stats.membersofActive, 0)
    // this needs checking
    //const globalConnectionsCount = stats.connected
    const globalConnectionsCount = Math.max(stats.connected-stats.membersofActive, 0)
    const localConnectionsCount = this.state.peers.
      filter((peer) => peer.host == 'localhost' || ip.isPrivate(peer.host) ).
      filter((peer) => peer.connected).
      length
    
    return <VerticalFilledContainer id="sync">
      <div className="header">
        <h1>Connections</h1>
        <div className="connection-counter">{globalConnectionsCount} <i className="fa fa-globe" /> Global</div>
        <div className="connection-counter">{localConnectionsCount}  <i className="fa fa-wifi" /> Local</div>
      </div>

      <div className='peer-status-group'> 
        <h2>Pubs</h2>
        <p className='explanatory-text'> Pubs are just peers with static addresses, making them easy to find on the web. They're commonly servers which have been set up to serve as your local pub - a place to drop by and catch and share news. </p>
        <p className='explanatory-text'><i className='unknown-peer-symbol fa fa-question-circle' /> : A peer that is not yet following you (so won't propogate your news).  </p>  
        {
          this.state.peers.filter((peer) => peer.host != 'localhost' && !ip.isPrivate(peer.host)).
            map((peer, i) => <PeerStatus key={peerId(peer)} peer={peer} />)
        }
        <div className="toolbar join-pub">
          <InviteModalBtn className="btn" onUseInvite={this.onUseInvite.bind(this)} />{' '}
        </div>
      </div>

      <div className='peer-status-group'> 
        <h2>Local Peers</h2>
        {
          this.state.peers.filter((peer) => peer.host == 'localhost' || ip.isPrivate(peer.host)).
            map((peer, i) => <PeerStatus key={peerId(peer)} peer={peer} />)
        }
      </div>
    </VerticalFilledContainer>
  }
}
      //{this.state.peers.map((peer, i) => <Peer key={peerId(peer)} peer={peer} />)}
