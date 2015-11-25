'use babel'
import React from 'react'
import { Link } from 'react-router'
import { InviteModalBtn } from '../modals'

export default class WelcomeHelp extends React.Component {
  render() {
    return <div className="card-grid" style={{padding: '10px 0'}}>
      <div className="card centered" style={{textAlign: 'center'}}>
        <h1>Hello! And welcome to <strong>Patchwork.</strong></h1>
      </div>
      <div className="card centered">
        <h2>Step 1: Join the public mesh</h2>
        <p>To reach the global network, you need a Pub to sync with you.</p>
        <div className="card-well">
          <InviteModalBtn className="btn" />
        </div>
      </div>
      <div className="card centered">
         <h2>Step 2: Follow people</h2>
         <p>Find other users in the <strong>Contacts</strong> page.</p>
      </div>
        <div className="card centered">
        <h2>Step 3: <img className="emoji" src="./img/emoji/metal.png" width="20" height="20"/></h2>
        <p>You can send <strong>Public Posts</strong> and <strong>Secret Messages</strong> using the blue button on the top right of your feed.</p>
      </div>
      <Link className="card centered btn selected highlighted" style={{display: 'block', textAlign: 'center'}} to='/'><h3>Got it.</h3></Link>
    </div>
  }
}