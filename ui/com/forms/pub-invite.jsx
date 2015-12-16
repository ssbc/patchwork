'use babel'
import React from 'react'
import ref from 'ssb-ref'
import { rainbow } from '../index'
import MDLSpinner from '../mdl-spinner'
import { InviteErrorExplanation, InviteErrorHelp } from '../help/forms'
import app from '../../lib/app'

export default class PubInvite extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      code: this.props.code,
      info: false,
      error: false,
      isProcessing: false
    }
  }

  onChange(e) {
    this.setState({ code: e.target.value })    
  }

  componentDidMount() {
    this.props.setIsReady(true)
    this.props.setIsValid(true)
    this.props.setHelpText(<div className="faq">
      { this.props.gotoNextStep ?
        <div><a onClick={this.props.gotoNextStep}>You can skip this step</a>, but your messages {"won't"} reach outside the WiFi until you do it.</div>
        : '' }
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

  getValues(cb) {
    cb({ code: this.state.code })
  }

  submit(cb) {
    this.getValues(values => {
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
      app.ssb.invite.accept(code, err => {
        if (err) {
          console.error(err)
          return this.setState({ isProcessing: false, info: false, error: err })
        }

        // trigger sync with the pub
        app.ssb.gossip.connect(code.split('~')[0])
        cb()
      })
    })
  }
  render() {
    const msg = (this.state.error) ?
      <InviteErrorExplanation error={this.state.error} /> :
      (this.state.info || '')
    const helpText = (this.state.error) ? <InviteErrorHelp error={this.state.error} /> : ''

    return <div>
      <h1>Connect with {rainbow('Public Peers')}</h1>
      <h3>Public Peers host your messages online.</h3>
      <form className="fullwidth" onSubmit={e=>e.preventDefault()}>
        <fieldset>
          <input type="text" value={this.state.code} onChange={this.onChange.bind(this)} placeholder="Enter the invite code here" />
          <div>{msg}</div>
          <div>{helpText}</div>
        </fieldset>
      </form>
      { this.state.isProcessing ? <MDLSpinner /> : '' }
    </div>
  }
}