'use babel'
import React from 'react'
import { VerticalFilledContainer } from '../com/index'
import LeftNav from '../com/leftnav'
import InfoPlaque from '../com/info-plaque'

export default class AddFriend extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return <VerticalFilledContainer id="add-friend" className="flex">
      <LeftNav location={this.props.location} />
      <div className="main flex-fill">
        <h1>Add Friend</h1>
        <h3 style={{marginTop: 5}}>Send your lookup code to your friend, and ask them to send theirs.</h3>
        <InfoPlaque label="Your Lookup Code">{app.user.id}</InfoPlaque>
        <h3>Enter their code below:</h3>
        <div className="add-friend-lookup flex" data-label="Their Lookup Code">
          <input className="flex-fill" placeholder="Their Lookup Code" />
          <a>Lookup</a>
        </div>
        <br/>
        <hr/>
        <h1>Public Friends <i className="fa fa-exclamation-triangle" /></h1>
        <h3><strong>You have no public friends</strong>, which means only people on your WiFi will receive your messages.</h3>
      </div>
    </VerticalFilledContainer>
  }
}