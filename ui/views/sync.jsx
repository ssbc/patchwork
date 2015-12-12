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
import PubInvite from '../com/forms/pub-invite'
import Modal from '../com/modals/single'
import ModalBtn from '../com/modals/btn'

function peerId (peer) {
  return peer.host+':'+peer.port+':'+peer.key
}

function peerSorter (a, b) {
  // prioritize peers that follow the user
  const bBoost = (social.follows(b.key, app.user.id)) ? 1000 : 0
  const aBoost = (social.follows(a.key, app.user.id)) ? 1000 : 0
  // then sort by # of announcers
  try {
    return (bBoost + b.announcers.length) - (aBoost + a.announcers.length)
  } catch(err) { console.log('a', a); console.log('b', b); throw err }
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

class PeerGraph extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      graph: peersToGraph(props.peersForGraph, props.contactedPeerIds),
      contactedPeerIds: props.contactedPeerIds
    }
  }

  componentDidMount () {
    this.setupRenderer()
  }

  componentWillReceiveProps (nextProps) {
    this.state.graph = updateGraph(this.state, nextProps.peersForGraph, nextProps.contactedPeerIds)
  }

  componentWillUnmount () {
    this.state.renderer.dispose()
  }

  setupRenderer () {
    const el = ReactDOM.findDOMNode(this)
    const renderer = createRenderer(this.state.graph, el)

    renderer.run()

    renderer.svgRoot.addEventListener('mouseover', function(ev) { 
      if (ev.target.nodeName == "circle") {
        const name = ev.target.getAttribute('text')
        const id = ev.target.getAttribute('id')

        document.querySelector("svg g text").innerHTML = name
        document.querySelector("svg g image").setAttribute('xlink:href', u.profilePicUrl(id))
      }

      ev.stopPropagation()
    })
    renderer.svgRoot.addEventListener('mouseout', function(ev) { 
      if (ev.target.nodeName == "circle") {
        document.querySelector("svg g text").innerHTML = ''
        document.querySelector("svg g image").setAttribute('xlink:href', '')
      }

      ev.stopPropagation()
    })


    this.setState({
      renderer: renderer
    })
  }

  render () {
    return <div className="peer-graph-container" />
  }
}

function createRenderer (graph, el) {
  let renderer = ngraphSvg(graph, {
    container: el,
    scrollSpeed: 0.01,
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
      dragCoeff: 0.01,
      gravity: -1.5,
      theta: 0.7
      //theta: 0.8
    }
  }).node( function nodeBuilder(node) {
    const isFriend = social.follows(app.user.id, node.data.id) && social.follows(node.data.id, app.user.id)
    const isRelayPeer = node.data.isRelayPeer
    const isConnectedPeer = node.data.isConnectedPeer

    let radius = 5
    let nodeClass = new Array

    if (node.data.isUser) { 
      radius = 15
      nodeClass.push('is-user')
    }
    if (isFriend) nodeClass.push('is-friend')
    if (isConnectedPeer) nodeClass.push('is-connected')
    if (isRelayPeer) radius = 10

    return ngraphSvg.svg("circle", {
      r: radius,
      cx: 2*radius,
      cy: 2*radius,
      class: nodeClass.join(' '),
      id: node.data.id,
      text: node.data ? node.data.name : undefined
    })
  }).placeNode( function nodePositionCallback(nodeUI, pos) {
    nodeUI.attr("cx", pos.x).attr("cy", pos.y)
  }).link( function linkBuilder(linkUI, pos) {
    const fromNode = graph.getNode(linkUI.fromId)
    const toNode = graph.getNode(linkUI.toId)

    //link is from or to a 'relayPeer'
    const involvesRelayPeer = fromNode.data.isRelayPeer || toNode.data.isRelayPeer 
    const isLinkingUser = fromNode.data.isUser || toNode.data.isUser 
    const isConnected = isLinkingUser && linkUI.data.isConnected

    let linkClass = new Array
    if (isLinkingUser) linkClass.push('is-linking-user')
    if (isConnected) linkClass.push('is-connected')
    if (involvesRelayPeer) linkClass.push('involves-relay-peer')

    return ngraphSvg.svg("line", {
      id: fromNode.id + toNode.id,
      class: linkClass.join(' ')
    })
  })

  let group = ngraphSvg.svg("g", {transform: "translate(10 20)"})
  let text = ngraphSvg.svg("text", {
    fill: '#555',
    x: 0,
    y: 90
  })
  let img = ngraphSvg.svg("image", {
    link: '',
    width: 80,
    height: 80,
    x: 0,
    y: -5
  })

  group.append(img)
  group.append(text)

  renderer.svgRoot.append( group )
  return renderer
}


function peersToGraph (peers, contactedPeerIds) {
  let graph = ngraphGraph()

  if (!peers || !contactedPeerIds) return graph

  return updateGraph(state, peers, contactedPeerIds)
}

function toggleClass(classes, className) {
  if ( new RegExp(className).test(classes) ) { 
    return classes.replace(className, '')
  } else { 
    return classes + ' ' + className
  }
}

function updateGraph (state, peers, contactedPeerIds) {
  let graph = state.graph
  const renderer = state.renderer

  if (!peers || !contactedPeerIds) return graph
  const remote = contactedPeerIds.remote
  const local = contactedPeerIds.local
  const connected = contactedPeerIds.connected

  //get and update OR create each peer node
  peers.forEach( function(peer) {
    const isRelayPeer = remote.indexOf(peer.id) != -1
    const isLocalPeer = local.indexOf(peer.id) != -1
    const isConnectedPeer = connected.indexOf(peer.id) != -1

    let node = graph.getNode(peer.id)
    if (node) {
      if (node.data.isConnectedPeer != isConnectedPeer) { //update node if connected-status has changed
        const svgNode = state.renderer.svgRoot.getElementById(node.data.id)
        ngraphSvg.svg(svgNode, { class: toggleClass(svgNode.getAttribute('class'), 'is-connected') })
      } 
      //else if (node.data.isRelayPeer != isRelayPeer) {   //update node if relay-status has changed
        //const svgNode = state.renderer.svgRoot.getElementById(node.data.id)
        //ngraphSvg.svg(svgNode, { class: toggleClass(svgNode.getAttribute('class'), 'relay-peer') })
      //}
      
    } else {
      graph.addNode( peer.id , {
        id: peer.id,
        name: peer.name,
        isUser: peer.isUser,
        isLAN: peer.isLAN,
        isRelayPeer: isRelayPeer,
        isLocalPeer: isLocalPeer,
        isConnectedPeer: isConnectedPeer
      })
    }
  })

  //add links for each peer
  peers.forEach( function(peer) {
    peers.forEach( function(otherPeer) {
      if (peer === otherPeer) return
      // skip if reverse link already exists
      if (graph.getLink(otherPeer.id, peer.id)) return

      const involvesRelayPeer = remote.indexOf(peer.id) != -1 || remote.indexOf(otherPeer.id) != -1
      const isConnected = (connected.indexOf(peer.id) != -1 && otherPeer.id == app.user.id) || 
                          (connected.indexOf(otherPeer.id) != -1 && peer.id == app.user.id)

      const areFriends = social.follows(otherPeer.id, peer.id) && social.follows(otherPeer.id, peer.id)

      const edge = graph.getLink(peer.id, otherPeer.id)
      if (edge) {
        if (edge.data.isConnected != isConnected) { // update edge if connection has changed
          //graph.removeLink(edge)
          const svgEdge = state.renderer.svgRoot.getElementById(peer.id + otherPeer.id)
          ngraphSvg.svg(svgEdge, { class: toggleClass(svgEdge.getAttribute('class'), 'is-connected') })
        } 
         
        return
      }

      // skip if not (connected OR (are friends with each other AND one is a relay))
      if (!(isConnected || (areFriends && involvesRelayPeer) )) return

      graph.addLink(peer.id, otherPeer.id, {
        isConnected: isConnected
      })
    })
  })

  
  //add empty info box
  return graph
}

class PeerStatus extends React.Component {
  render() {
    const peer = this.props.peer
    const connectionClass = peer.connected ? ' connected' : ''
    let failureClass = ''
    let lastConnectedMessage = ''

    if (!peer.connected) {
      if (lastConnected(peer)) {
        lastConnectedMessage = <div className="light">Last seen at <NiceDate ts={peer.time.connect} /></div>
      } else {
        failureClass = ' failure'
        lastConnectedMessage = ''//<i className="fa fa-close connection-status" title="last attempted connection: " />
      }
    }

    const isMember = social.follows(peer.key, app.user.id)
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
        user.name = u.getName(user.id)
        user.isUser = user.id === app.user.id
        user.isLAN = isLAN(user)
        //TODO get this working somehow...   user.isConnected = user.connected
        //user.nfollowers = social.followers(user.id).length
        user.followed = social.follows(app.user.id, user.id)
        user.follows = social.follows(user.id, app.user.id)
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
      filter((peer) => peer.connected).
      length

    return <VerticalFilledContainer id="sync">
      <div className="header">
        <div className="connection-counter">{globalConnectionsCount} <i className="fa fa-globe" /> Public Peers</div>
        <div className="connection-counter">{localConnectionsCount}  <i className="fa fa-wifi" /> Local Peers</div>
        <ModalBtn className="btn" Form={PubInvite} nextLabel="Submit"><i className="fa fa-cloud"/> Add Public Peer</ModalBtn>
      </div>

      <div className='peer-status-group'>
        <PeerGraph peersForGraph={this.state.peersForGraph} contactedPeerIds={this.state.contactedPeerIds} />
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
          this.state.peers.filter(isNotLAN).
            map((peer, i) => <PeerStatus key={peerId(peer)} peer={peer} />)
        }
      </div>
    </VerticalFilledContainer>
  }
}

