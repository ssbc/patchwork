'use babel'
import React from 'react'
import ref from 'ssb-ref'
import MDLSpinner from 'patchkit-mdl-spinner'
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
      <h1>Join a Pub</h1>
      <h3>Pubs host your messages online, and connect you globally.</h3>
      <form className="fullwidth" onSubmit={e=>e.preventDefault()}>
        <fieldset>
          <input type="text" value={this.state.code} onChange={this.onChange.bind(this)} placeholder="Enter the invite code here" />
          <div>{msg}</div>
          <div>{helpText}</div>
        </fieldset>
      </form>
      { this.state.isProcessing ? <MDLSpinner /> : '' }
      <div className="faq text-center">
        { this.props.gotoNextStep ?
          <div><a onClick={this.props.gotoNextStep}>You can skip this step</a>, but your messages {"won't"} reach outside the WiFi until you do it.</div>
          : '' }
        <div className="faq-entry">
          <div>{"What's"} an invite code?</div>
          <div>An invite code tells the Pub to join your contacts.</div>
        </div>
        <div className="faq-entry">
          <div>Where can I get an invite code?</div>
          <div>You should ask a Pub operator. Many of them hang out in #scuttlebutt on Freenode.</div>
        </div>
        <div className="faq-entry">
          <div>Can I create a Pub?</div>
          <div>Yes, but it requires a public server. If you have one, you can <a href="http://ssbc.github.io/docs/scuttlebot/howto-setup-a-pub.html" target="_blank">follow&nbsp;this&nbsp;guide</a>.</div>
        </div>
      </div>
    </div>
  }
}