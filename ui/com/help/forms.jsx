'use babel'
import React from 'react'

export class InviteErrorExplanation extends React.Component {
  render() {
    if (!this.props.error)
      return <span/>
    console.log(this.props.error)
    const msg = this.props.error.message.toLowerCase()

    if (~msg.indexOf('invite code not provided'))
      return <div className="error">The invite code is required.</div>

    if (~msg.indexOf('incorrect or expired') || ~msg.indexOf('has expired'))
      return <div className="error">The invite code is mis-issued or expired.</div>

    if (~msg.indexOf('invalid') || ~msg.indexOf('feed to follow is missing') || ~msg.indexOf('may not be used to follow another key'))
      return <div className="error">Something is wrong with the invite code.</div>

    if (~msg.indexOf('pub server did not have correct public key'))
      return <div className="error">Connection failure.</div>

    if (~msg.indexOf('unexpected end of parent stream'))
      return <div className="error">Failed to connect to the pub server.</div>

    if (~msg.indexOf('ENOTFOUND'))
      return <div className="error">The pub server could not be found.</div>

    if (~msg.indexOf('already following'))
      return <div className="error">You are already followed by this pub server.</div>

    return <div className="error">Sorry, an unexpected error occurred.</div>
  }
}

export class InviteErrorHelp extends React.Component {
  render() {
    if (!this.props.error)
      return <span/>
    const err = this.props.error
    let msg = err.message.toLowerCase()
    let helpText = false

    if (~msg.indexOf('incorrect or expired') || ~msg.indexOf('has expired'))
      helpText = 'The invite code is incorrect or expired. Make sure you copy/pasted it correctly. If you did, ask the pub-operator for a new code and try again.'

    if (~msg.indexOf('invalid') || ~msg.indexOf('feed to follow is missing') || ~msg.indexOf('may not be used to follow another key'))
      helpText = 'The invite code is malformed. Make sure you copy/pasted it correctly. If you did, ask the pub-server owner for a new code and try again.'

    if (~msg.indexOf('pub server did not have correct public key'))
      helpText = 'The pub server did not identify itself correctly for the invite code. Ask the pub-operator for a new code and try again.'

    if (~msg.indexOf('could not connect to server') || ~msg.indexOf('unexpected end of parent stream'))
      helpText = 'Failed to connect to the pub server. Check your connection, make sure the pub server is online, and try again.'

    if (~msg.indexOf('ENOTFOUND'))
      helpText = 'Check your connection, make sure the pub server is online, and try again. If this issue persists, check with the pub operator.'

    if (!helpText)
      return <span/>
    return <div className="help-text">{helpText}</div>
  }
}
