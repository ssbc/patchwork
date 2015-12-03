'use babel'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import ip from 'ip'
import ModalFlow from './flow'
import MDLSpinner from '../mdl-spinner'
import { SetupForm } from '../forms'
import app from '../../lib/app'

// how long should we scan until discouraged?
const TIME_TILL_SCAN_IS_DISCOURAGED = 8e3

// user profile
class ProfileSetupStep extends React.Component {  
  submit() {
    this.refs.form.getValues(values => {
      let n = 0, m = 0
      const cb = () => {
        m++
        return (err) => {
          if (err) app.issue('Error While Publishing', err, 'Setup modal publishing new about msg')
          else if (++n >= m)
            this.gotoNextStep()
        }
      }
      if (values.name)
        app.ssb.publish(schemas.name(app.user.id, values.name), cb())
      if (values.image)
        app.ssb.publish(schemas.image(app.user.id, values.image), cb())
    })
  }

  render() {
    return <div>
      <h1>Welcome to {rainbow('Patchwork')}</h1>
      <SetupForm ref="form" onValidChange={this.props.setCanProgress} />
    </div>
  }
}

// follow peers on the wifi
class NearbySetupStep extends React.Component {
  constructor(props) {
    super(props)
    this.state ={
      foundNearbyPeers: [], // array of IDs
      isScanning: true
    }
  }
  componentDidMount() {
    // update state, start timers, start listeners
    this.startScan()
    this.props.setCanProgress(true)
    this.props.setHelpText('Patchwork is checking for other users on your WiFi. Don\'t worry if you can\'t find anybody, because you can try again later.')
    this.onPeersUpdate = () => {
      this.setState({
        foundNearbyPeers: app.peers
          .filter(p => !ip.isLoopback(p.host) && ip.isPrivate(p.host))
          .map(p => p.key)
      }, () => console.log(this.state.foundNearbyPeers))
    }
    this.onPeersUpdate()
    app.on('update:peers', this.onPeersUpdate)
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
    }, TIME_TILL_SCAN_IS_DISCOURAGED)
  }

  render() {
    return <div>
      <h1>Connect with {rainbow('Nearby Friends')}</h1>
      { (!this.state.foundNearbyPeers.length && this.state.isScanning) ?
        <div>
          <h3>Scanning local network. <a onClick={this.props.gotoNextStep}>You can skip this step.</a></h3>
          <div className="mdl-spinner-container flex">
            <div className="flex-fill"/>
            <MDLSpinner />
            <div className="flex-fill"/>
          </div>
        </div> : '' }
      { (!this.state.foundNearbyPeers.length && !this.state.isScanning) ?
        <h3>
          {"Nobody was found on your WiFi. That's okay!"}<br/>
          <a onClick={this.props.gotoNextStep}>Skip this step</a> or{' '}
          <a onClick={this.startScan.bind(this)}>Try Again</a>.
        </h3>
        : '' }
    </div>
  }
}

// use pub invites
class PubSetupStep extends React.Component {
  render() {
    return <h1>Connect with {rainbow('Pubs')}</h1>
  }
}

// all steps combined
export default class SetupFlow extends ModalFlow {
  constructor(props) {
    super(props)
    // setup steps
    this.stepLabels = ['Profile', 'Nearby', 'Pubs']
    this.stepComs = [ProfileSetupStep, NearbySetupStep, PubSetupStep]
  }
}

// helper to create rainbowed-out elements
function rainbow (str) {
  return <span className="rainbow">{str.split('').map((c,i) => <span key={i}>{c}</span>)}</span>
}
