'use babel'
import React from 'react'
import ReactDOM from 'react-dom'
import pull from 'pull-stream'
import ip from 'ip'
import ngraphGraph from 'ngraph.graph'
import ngraphSvg from 'ngraph.svg'
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

function isLAN (peer) {
  return peer.host == ip.isLoopback(peer.host) || ip.isPrivate(peer.host)
}

function isNotLAN (peer) {
  return !isLAN(peer)
}

class PeerGraph extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      graph: peersToGraph(props.peersForGraph)
    }
  }

  componentDidMount () {
    this.setupRenderer()
  }

  componentWillReceiveProps (nextProps) {
    // TODO merge diff between this.props and nextProps
    // into updates for this.state.graph
    // which the render will listen to through events
    // and apply appropriately
    //
    // HACK instead
    this.state.graph = updateGraph(this.state.graph, nextProps.peersForGraph)
  }

  componentWillUnmount () {
    this.state.renderer.dispose()
  }

  setupRenderer () {
    const el = ReactDOM.findDOMNode(this)
    const renderer = createRenderer(this.state.graph, el)

    renderer.run()

    this.setState({
      renderer: renderer
    })
  }

  render () {
    return <div className="peer-graph-container" />
  }
}

function createRenderer (graph, el) {

  return ngraphSvg(graph, {
    container: el,
    // defaults
    //physics: {
    //  springLength: 30,
    //  springCoeff: 0.0008,
    //  dragCoeff: 0.01,
    //  gravity: -1.2,
    //  theta: 1
    //}
    physics: {
      springLength: 20,
      springCoeff: 0.0001,
      dragCoeff: 0.15,
      gravity: -1.5,
      theta: 0.8
    }
  }).node( function nodeBuilder(node) {
    const isFriend = node.data.isUser || (social.follows(app.user.id, node.data.id) && social.follows(node.data.id, app.user.id)) 
    const nodeColor = "#F00"
    const radius = isFriend ? 3 : 2
    
    return ngraphSvg.svg("circle", {
      r: radius,
      cx: 2*radius,
      cy: 2*radius,
      fill: nodeColor,
      text: node.data ? node.data.name : undefined
    })
  }).placeNode( function nodePositionCallback(nodeUI, pos) {
    nodeUI.attr("cx", pos.x).attr("cy", pos.y)
  }).link( function linkBuilder(linkUI, pos) {

    console.log('linkUI', linkUI)
    const linkOpacity = ( linkUI.toId == app.user.id || linkUI.fromId == app.user.id ) ? 0.8 : 0.15

    return ngraphSvg.svg("line", {
      stroke: "#F00",
      opacity: linkOpacity
    })
  })
}


function peersToGraph (peers) {
  let graph = ngraphGraph()

  if (!peers) return graph

  return updateGraph(graph, peers)
}

function updateGraph (graph, peers) {
  if (!peers) return graph

  //create each peer
  peers.forEach( function(peer) {
    // TODO - this early return will assume there are no new connections for that peer
    if (graph.getNode(peer.id)) return 

    const newNode = graph.addNode(peer.id, {
      id: peer.id,
      name: peer.name,
      isLAN: peer.isLAN,
      isUser: peer.isUser
    })

  })
  //add links for each peer
  peers.forEach( function(peer) {
    peers.forEach( function(otherPeer) {
      if (peer === otherPeer) return
      if (graph.getLink(peer.id, otherPeer.id)) return

      if ( social.follows(peer.id, otherPeer.id) && social.follows(otherPeer.id, peer.id) ) {
        graph.addLink(peer.id, otherPeer.id)
      }
    })
  })
  return graph
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
    const peer = this.props.peer
    const connectionClass = peer.connected ? ' connected' : ''
    let failureClass = ''
    let lastConnected = ''
    if (!peer.connected) {
      if (peer.time && peer.time.connect) {
        lastConnected = <div className="light">Last seen at <NiceDate ts={peer.time.connect} /></div>
      } else {
        failureClass = ' failure'
        lastConnected = ''//<i className="fa fa-close connection-status" title="last attempted connection: " />
      }
    }

        // { isMember ? <span className={'known-peer-symbol connection-status'+connectionClass}></span> :
        //              // <i className={'unknown-peer-symbol fa fa-question-circle connection-status'+connectionClass} /> }
    const isMember = social.follows(peer.key, app.user.id)
    return <div className={'peer flex'+failureClass}>
      <div className='flex-fill'>
        { isMember ? <i className={'fa fa-star connection-status'+connectionClass} /> :
                     <i className={'fa fa-circle connection-status'+connectionClass} /> }
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
        stats: u.getPubStats(peers)
      })
    })

    //fetch users list
    //TODO - dry up (copied this from user-list.jsx)
    pull(
      app.ssb.latest(),
      pull.map((user) => {
        user.name = u.getName(user.id)
        user.isUser = user.id === app.user.id
        //user.nfollowers = social.followers(user.id).length
        user.followed = social.follows(app.user.id, user.id)
        user.follows = social.follows(user.id, app.user.id)
        user.isLAN = isLAN(user)
        return user
      }),
      pull.collect((err, users) => {
        if (err)
          return app.minorIssue('An error occurred while fetching known users', err)

        users.sort(function (a, b) {
          return b.nfollowers - a.nfollowers
        })
        console.log("pulled users", users)
        //console.log("peer count", users.length)
        //console.log("user friends", users.filter((u) =>{ return u.follows && u.followed }).length)
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
    const globalConnectionsCount = stats.connected
    //const globalConnectionsCount = Math.max(stats.connected-stats.membersofActive, 0)
    const localConnectionsCount = this.state.peers.
      filter(isLAN).
      filter((peer) => peer.connected).
      length

    return <VerticalFilledContainer id="sync">
      <div className="header">
        <h1>Network</h1>
        <div className="connection-counter">{globalConnectionsCount} <i className="fa fa-globe" /> Pubs</div>
        <div className="connection-counter">{localConnectionsCount}  <i className="fa fa-wifi" /> Local</div>
        <InviteModalBtn className="btn" onUseInvite={this.onUseInvite.bind(this)} />
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
          <h2><i className="fa fa-globe" /> Pubs</h2>
          <div className='explanatory-text'>Pubs are just peers with static addresses, which means they are easy to find. They're commonly servers which have been set up to operate as your local pub - a place to drop by and share data.</div>
          <div className='explanatory-text'>
            <i className='fa fa-star' /> Is following you - they will replicate your data. <br />
            <i className='fa fa-circle' /> Is not following you, but you might share data about mutual aquantances.
          </div>
        </div>
        {
          this.state.peers.filter(isNotLAN).
            map((peer, i) => <PeerStatus key={peerId(peer)} peer={peer} />)
        }
      </div>

      <div className='peer-status-group'>
        <PeerGraph peersForGraph={this.state.peersForGraph} />
      </div>

    </VerticalFilledContainer>
  }
}
      //{this.state.peers.map((peer, i) => <Peer key={peerId(peer)} peer={peer} />)}
