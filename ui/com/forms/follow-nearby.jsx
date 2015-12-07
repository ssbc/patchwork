'use babel'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import ip from 'ip'
import multicb from 'multicb'
import { rainbow } from '../index'
import MDLSpinner from '../mdl-spinner'
import FollowList from '../form-elements/follow-list'
import app from '../../lib/app'

// how long should we scan until discouraged?
const TIME_TILL_SCAN_GIVES_UP = 8e3
// how long should we give the first "scan" ?
const TIME_FOR_FIRST_SCAN = 5e3

const NEARBY_SEARCHING_HELPTEXT = 'Patchwork is checking for other users on your WiFi. Don\'t worry if you can\'t find anybody, because you can try again later.'
const NEARBY_FOUND_HELPTEXT = 'These users are on your WiFi. Be careful! Names and pictures are not unique, so ask your friends for their @ id if you\'re in a public setting.'

// follow peers on the wifi
export default class FollowNearby extends React.Component {
  constructor(props) {
    super(props)
    this.state ={
      foundNearbyPeers: [], // array of IDs
      following: new Set(), // set of IDs to follow (on submit)
      isScanning: true
    }
  }
  componentDidMount() {
    this.startScan()
    this.props.setIsValid(true)
    this.props.setHelpText(NEARBY_SEARCHING_HELPTEXT)

    // update peers after a delay
    // (use a delay so the user sees the app "scanning")
    this.onPeersUpdate = () => {
      var peers = new Set()
      app.peers
        .filter(p => !ip.isLoopback(p.host) && ip.isPrivate(p.host))
        .forEach(p => peers.add(p.key))
      peers = peers.toJSON()
      if (peers.length) {
        this.props.setHelpText(NEARBY_FOUND_HELPTEXT)
        this.props.setIsReady(true)
      }
      this.setState({ foundNearbyPeers: peers })
    }
    setTimeout(() => {
      this.onPeersUpdate()
      app.on('update:peers', this.onPeersUpdate)
    }, TIME_FOR_FIRST_SCAN)
  }

  componentWillUnmount() {
    clearTimeout(this.scanDiscouragedTimer)
    app.removeListener('update:peers', this.onPeersUpdate)
  }

  startScan() {    
    // set state and start a timer
    this.setState({ isScanning: true })
    this.props.setIsReady(false)
    this.scanDiscouragedTimer = setTimeout(() => {
      // give up
      this.props.setIsReady(true)
      this.setState({ isScanning: false })
    }, TIME_TILL_SCAN_GIVES_UP)
  }

  toggleFollowing(id) {
    if (this.state.following.has(id))
      this.state.following.delete(id)
    else
      this.state.following.add(id)
    this.setState({ following: this.state.following })
  }

  submit(cb) {
    if (this.state.following.size === 0)
      return cb() // no follows

    // publish follows
    var done = multicb()
    this.state.following.forEach(id => {
      app.ssb.publish(schemas.follow(id), done())
    })
    done(cb)
  }

  render() {
    const peers = this.state.foundNearbyPeers
    const showPeers = (peers.length > 0)
    return <div>
      <h1>Connect with {rainbow('Nearby Friends')}</h1>
      { showPeers ?
        <div>
          <h3>Who would you like to follow?</h3>
          <FollowList ids={peers} following={this.state.following} onClick={this.toggleFollowing.bind(this)} />
        </div> : '' }
      { (!showPeers && this.state.isScanning) ?
        <div>
          <h3>Scanning local network. <a onClick={this.props.gotoNextStep}>You can skip this step.</a></h3>
          <div className="mdl-spinner-container flex">
            <div className="flex-fill"/>
            <MDLSpinner />
            <div className="flex-fill"/>
          </div>
        </div> : '' }
      { (!showPeers && !this.state.isScanning) ?
        <h3>
          {"Nobody was found on your WiFi. That's okay!"}<br/>
          <a onClick={this.props.gotoNextStep}>Skip this step</a> or{' '}
          <a onClick={this.startScan.bind(this)}>Try Again</a>.
        </h3>
        : '' }
    </div>
  }
}