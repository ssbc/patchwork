'use babel'
import React from 'react'
import ReactDOM from 'react-dom'
import pull from 'pull-stream'
import ip from 'ip'
import app from '../lib/app'
import u from '../lib/util'
import pu from 'patchkit-util'
import social from 'patchkit-util/social'
import VerticalFilledContainer from 'patchkit-vertical-filled'
import { UserLink } from 'patchkit-links'
import NiceDate from 'patchkit-nicedate'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import PubInvite from 'patchkit-form-pub-invite'
import ModalBtn from 'patchkit-modal/btn'

function peerId (peer) {
  return peer.host+':'+peer.port+':'+peer.key
}

function peerSorter (a, b) {
  if(a.state === 'connected' && b.state !== 'connected')
    return -1
  else if(a.state !== 'connected' && b.state === 'connected')
    return 1
  //most recent interaction
  return a.stateChanged - b.stateChanged
}

function isLAN (peer) {
  // TODO this looks like a typo? 
  //return peer.host == ip.isLoopback(peer.host) || ip.isPrivate(peer.host)
  return ip.isPrivate(peer.host) || ip.isLoopback(peer.host)
}

function isNotLAN (peer) {
  return !isLAN(peer)
}

function lastConnected (peer) {
  if (!peer.time) return undefined

  return (peer.time.connect == 0) ? undefined : peer.time.connect
}

class PeerStatus extends React.Component {
  render() {
    const peer = this.props.peer
    const connectionClass = peer.state === 'connected' ? ' connected' :''
    let failureClass = ''
    let lastConnectedMessage = ''

    if (peer.state) {
      lastConnectedMessage = <div className="light">{peer.state} <NiceDate ago ts={peer.stateChange} /></div>
    } else if (peer.failure) {
      failureClass = ' failure'
      lastConnectedMessage = ''//<i className="fa fa-close connection-status" title="last attempted connection: " />
    }

    const isMember = social.follows(app.users, peer.key, app.user.id)
    return <div className={'peer flex'+failureClass}>
      <div className='flex-fill'>
        { isMember ? <i className={'fa fa-star connection-status'+connectionClass} /> :
                     <i className={'fa fa-circle connection-status'+connectionClass} /> }
        <UserLink id={peer.key} />
      </div>
      {lastConnectedMessage}
    </div>
  }
}

export default class Sync extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      users: [],
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
        contactedPeerIds: u.getContactedPeerIds(peers),
        stats: u.getPubStats(peers)
      })
    })

    //fetch users list
    //TODO - dry up (copied this from user-list.jsx).
    //     - also clarify user vs peer usage
    pull(
      app.ssb.latest(),
      pull.map((user) => {
        user.name = pu.getName(app.users, user.id)
        user.isUser = user.id === app.user.id
        user.isLAN = isLAN(user)
        //TODO get this working somehow...   user.isConnected = user.connected
        //user.nfollowers = social.followers(app.users, user.id).length
        user.followed = social.follows(app.users, app.user.id, user.id)
        user.follows = social.follows(app.users, user.id, app.user.id)
        return user
      }),
      pull.collect((err, users) => {
        if (err)
          return app.minorIssue('An error occurred while fetching known users', err)

        users.sort(function (a, b) {
          return b.nfollowers - a.nfollowers
        })

        this.setState({ peersForGraph: users })
      })
    )

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

    this.setState({
      peers: peers,
      contactedPeerIds: u.getContactedPeerIds(peers),
      stats: u.getPubStats(peers)
    })
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
    if (i !== peers.length) {
      this.setState({
        peers: peers,
        contactedPeerIds: u.getContactedPeerIds(peers),
        stats: u.getPubStats(peers)
      })
    }
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
    const globalConnectionsCount = stats.connected
    //const globalConnectionsCount = Math.max(stats.connected-stats.membersofActive, 0)
    const localConnectionsCount = this.state.peers.
      filter(isLAN).
      filter((peer) => peer.state === 'connected').
      length

    return <VerticalFilledContainer id="sync" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill">
        <div className="header">
          <div className="connection-counter">{globalConnectionsCount} <i className="fa fa-globe" /> Public Peers</div>
          <div className="connection-counter">{localConnectionsCount}  <i className="fa fa-wifi" /> Local Peers</div>
          <ModalBtn Form={PubInvite} nextLabel="Join"><a className="btn"><i className="fa fa-cloud"/> Join Pub</a></ModalBtn>
        </div>

        <div className='peer-status-group'>
          <div className="peer-status-group-header">
            <h2><i className="fa fa-wifi" /> Local</h2>
            { (this.state.peers.filter(isLAN).length == 0) ? <div className='explanatory-text'>There are currently no peers on your local network</div> : '' }
          </div>
          {
            this.state.peers.filter(isLAN).
              map((peer, i) => <PeerStatus key={peerId(peer)} peer={peer} />)
          }
        </div>

        <div className='peer-status-group'>
          <div className="peer-status-group-header">
            <h2><i className="fa fa-globe" /> Public</h2>
            <div className='explanatory-text'>Public Peers are just users with static addresses, which means they are easy to find. {"They're"} commonly servers which have been set up to share data.</div>
            <div className='explanatory-text'>
              <i className='fa fa-star' /> Is following you - they will replicate your data. <br />
              <i className='fa fa-circle' /> Is not following you, but you might share data about mutual aquantances.
            </div>
          </div>
          {
            this.state.peers.sort(peerSorter).filter(isNotLAN).
              map((peer, i) => <PeerStatus key={peerId(peer)} peer={peer} />)
          }
        </div>

        <div className='peer-status-group'>

        </div>
      </div>
      <RightNav/>
    </VerticalFilledContainer>
  }
}







