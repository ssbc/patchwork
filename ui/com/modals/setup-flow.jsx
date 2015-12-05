'use babel'
import React from 'react'
import schemas from 'ssb-msg-schemas'
import ref from 'ssb-ref'
import ip from 'ip'
import multicb from 'multicb'
import ModalFlow from './flow'
import MDLSpinner from '../mdl-spinner'
import { SetupForm, InviteForm } from '../forms'
import FollowList from '../users/follow-list'
import app from '../../lib/app'

// how long should we scan until discouraged?
const TIME_TILL_SCAN_GIVES_UP = 8e3
// how long should we give the first "scan" ?
const TIME_FOR_FIRST_SCAN = 5e3

const NEARBY_SEARCHING_HELPTEXT = 'Patchwork is checking for other users on your WiFi. Don\'t worry if you can\'t find anybody, because you can try again later.'
const NEARBY_FOUND_HELPTEXT = 'These users are on your WiFi. Be careful! Names and pictures are not unique, so ask your friends for their @ id if you\'re in a public setting.'

// user profile
class ProfileSetupStep extends React.Component {  
  submit() {
    this.refs.form.getValues(values => {
      var done = multicb()
      if (values.name)  app.ssb.publish(schemas.name(app.user.id, values.name), done())
      if (values.image) app.ssb.publish(schemas.image(app.user.id, values.image), done())
      done(err => {
        if (err)
          return app.issue('Error While Publishing', err, 'Setup modal publishing new about msg')
        this.props.gotoNextStep()
      })
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
      following: new Set(), // set of IDs to follow (on submit)
      isScanning: true
    }
  }
  componentDidMount() {
    this.startScan()
    this.props.setCanProgress(true)
    this.props.setHelpText(NEARBY_SEARCHING_HELPTEXT)

    // update peers after a delay
    // (use a delay so the user sees the app "scanning")
    setTimeout(() => {
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

  submit() {
    if (this.state.following.size === 0)
      return this.props.gotoNextStep() // no follows

    // publish follows
    var done = multicb()
    this.state.following.forEach(id => {
      app.ssb.publish(schemas.follow(id), done())
    })
    done((err, msgs) => {
      if (err)
        return app.issue('Error While Publishing', err, 'Setup modal publishing new about msg')
      this.props.gotoNextStep()
    })
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

// use pub invites
class PubSetupStep extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      info: false,
      error: false,
      isProcessing: false
    }
  }
  componentDidMount() {
    this.props.setIsReady(true)
    this.props.setCanProgress(true)
    this.props.setHelpText(<div className="faq">
      <div><a onClick={this.props.gotoNextStep}>You can skip this step</a>, but your messages {"won't"} reach outside the WiFi until you do it.</div>
      <div className="well">
        <div className="faq-entry">
          <strong>Can I become a Public Peer?</strong><br/>
          Yes, but it requires a public IP address. If you have one, you can <a href="https://github.com/ssbc/docs#setup-up-a-pub" target="_blank">follow&nbsp;this&nbsp;guide</a>.
        </div>
        <div className="faq-entry">
          <strong>{"What's"} an invite code?</strong><br/>
          Invite codes tell a Public Peer to follow you socially, so {"they'll"} have your messages.
        </div>
        <div className="faq-entry">
          <strong>Where can I get an invite code?</strong><br/>
          Come to #scuttlebutt on Freenode and ask for one.
        </div>
      </div>
    </div>)
  }
  submit() {
    this.refs.form.getValues(values => {
      let code = values.code || ''
      this.setState({ isProcessing: true, error: false, info: false })

      // surrounded by quotes?
      // (the scuttlebot cli ouputs invite codes with quotes, so this could happen)
      if (code.charAt(0) == '"' && code.charAt(code.length - 1) == '"')
        code = code.slice(1, -1) // strip em

      // validate
      if (!code)
        return this.setState({ isProcessing: false, error: { message: 'Invite code not provided' } })
      if (!ref.isInvite(code))
        return this.setState({ isProcessing: false, error: { message: 'Invalid invite code' } })

      // use the invite
      this.setState({ info: 'Contacting server with invite code, this may take a few moments...' })
      app.ssb.invite.accept(code, (err) => {
        if (err) {
          console.error(err)
          return this.setState({ isProcessing: false, info: false, error: err })
        }

        // trigger sync with the pub
        app.ssb.gossip.connect(code.split('~')[0])
        this.props.gotoNextStep()
      })
    })
  }
  render() {
    return <div>
      <h1>Connect with {rainbow('Public Peers')}</h1>
      <h3>Public Peers host your messages online.</h3>
      <InviteForm ref="form" info={this.state.info} error={this.state.error} isDisabled={this.state.isProcessing} />
      { this.state.isProcessing ? <MDLSpinner /> : '' }
    </div>
  }
}

// all steps combined
export default class SetupFlow extends ModalFlow {
  constructor(props) {
    super(props)
    // setup steps
    this.stepLabels = [<i className="fa fa-user"/>, <i className="fa fa-wifi"/>, <i className="fa fa-cloud"/>]
    this.stepComs = [ProfileSetupStep, NearbySetupStep, PubSetupStep]
  }
}

// helper to create rainbowed-out elements
function rainbow (str) {
  return <span className="rainbow">{str.split('').map((c,i) => <span key={i}>{c}</span>)}</span>
}
