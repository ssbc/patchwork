'use babel'
import React from 'react'
import { Link } from 'react-router'
import { VerticalFilledContainer } from '../com/index'
import LeftNav from '../com/leftnav'
import FollowNearby from '../com/forms/follow-nearby'
import FollowFoafs from '../com/forms/follow-foafs'
import InputPlaque from '../com/form-elements/input-plaque'

export default class AddFriend extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    const numPubServers = 1 // TODO
    return <VerticalFilledContainer id="add-friend" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill">
        { '' /* TODO <div className="section">
          <h1>Add Contact</h1>
          <InputPlaque label="Contact's Address" placeholder="Enter your contact's address here to send an intro request" btn={<span><i className="fa fa-user-plus" /> Send Request</span>} />
        </div> */ }
        <div className="section"><FollowNearby /></div>
        <div className="section"><FollowFoafs /></div>
        { numPubServers === 0
          ? <div className="section">
            <h1>Pub Servers { numPubServers===0 ? <i className="fa fa-exclamation-triangle" /> : '' }</h1>
            <h3><strong>You have no pub servers</strong>, which means only people on your WiFi will receive your messages.</h3>
            <h3><Link className="btn" to="/add-pub"><i className="fa fa-laptop" /> Join a Pub Server</Link></h3>
          </div>
          : '' }
      </div>
    </VerticalFilledContainer>
  }
}