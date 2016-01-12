'use babel'
import React from 'react'
import { Link } from 'react-router'
import { VerticalFilledContainer } from '../com/index'
import LeftNav from '../com/leftnav'
import InputPlaque from '../com/form-elements/input-plaque'

export default class AddFriend extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const numPubServers = 0 // TODO
    return <VerticalFilledContainer id="add-friend" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill">
        <div className="section">
          <h1>Add Friend</h1>
          <h3 style={{marginTop: 5}}>Send this follow-code to your friend:</h3>
          <InputPlaque readOnly label="Your Follow Code" value={app.user.id} />
          <h3>And enter their follow-code below:</h3>
          <InputPlaque label="Their Follow Code" placeholder="Their Follow Code" btn={<span><i className="fa fa-user-plus" /> Lookup</span>} />
          <h4><i className="fa fa-info-circle" /> You can follow anybody to see their posts, but you must both follow each other to converse.</h4>
        </div>
        <div className="section">
          <h1>Pub Servers { numPubServers===0 ? <i className="fa fa-exclamation-triangle" /> : '' }</h1>
          { numPubServers === 0
            ? <h3><strong>You have no pub servers</strong>, which means only people on your WiFi will receive your messages.</h3>
            : <h3>You have <strong>{ numPubServers }</strong> pub servers broadcasting your messages.</h3> }
          <h3><Link className="btn" to="/add-pub"><i className="fa fa-laptop" /> Join a Pub Server</Link></h3>
        </div>
      </div>
    </VerticalFilledContainer>
  }
}