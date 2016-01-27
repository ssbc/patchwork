'use babel'
import React from 'react'
import ip from 'ip'
import UserSummary from '../user/summary'
import social from '../../lib/social-graph'
import app from '../../lib/app'

// follow peers on the wifi
export default class FollowNearby extends React.Component {
  constructor(props) {
    super(props)
    this.state ={
      foundNearbyPeers: [] // array of IDs
    }
  }
  componentDidMount() {
    // update peers after a delay
    // (use a delay so the user sees the app "scanning")
    this.onPeersUpdate = () => {
      var peers = new Set()
      app.peers
        .filter(p => !ip.isLoopback(p.host) && ip.isPrivate(p.host))
        .filter(p => !social.follows(app.user.id, p.key) && !social.flags(app.user.id, p.key))
        .forEach(p => peers.add(p.key))
      peers = [...peers]
      this.setState({ foundNearbyPeers: peers })

      // HACK
      // I want names to show up on these peers, and the local peers may still be replicating messages
      // so I'm having the app refresh its state every time the peers have polled
      // a better solution would be to have the backend state in sync with frontend through a continuous 'change' stream
      // but that's a future project
      // -prf
      app.fetchLatestState()
    }
    this.onPeersUpdate()
    app.on('update:peers', this.onPeersUpdate)
  }

  componentWillUnmount() {
    app.removeListener('update:peers', this.onPeersUpdate)
  }

  render() {
    const peers = this.state.foundNearbyPeers
    const hasPeers = (peers.length > 0)
    return <div>
      <h1>Nearby</h1>
      <h3 style={{marginTop: 5}}>{ hasPeers ? 'Potential contacts on your WiFi.' : 'Nobody found on your WiFi.' }</h3>
      { peers.map(id => <UserSummary key={id} pid={id} />) }
    </div>
  }
}