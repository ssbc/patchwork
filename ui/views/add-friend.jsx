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
      <div className="flex-fill">
        <div className="section">
          <h1>Add Friend</h1>
          <h3 style={{marginTop: 5}}>Send this follow-code to your friend:</h3>
          <InfoPlaque label="Your Follow Code">{app.user.id}</InfoPlaque>
          <h3>And enter their follow-code below:</h3>
          <div className="add-friend-lookup flex" data-label="Their Follow Code">
            <input className="flex-fill" placeholder="Their Follow Code" />
            <a><i className="fa fa-user-plus" /> Lookup</a>
          </div>
          <h4><i className="fa fa-info-circle" /> You can follow anybody to see their posts, but you must both follow each other to converse.</h4>
        </div>
        <div className="section">
          <h1>Pub Servers <i className="fa fa-exclamation-triangle" style={{color: '#D41E1E'}} /></h1>
          <h3><strong>You have no pub servers</strong>, which means only people on your WiFi will receive your messages.</h3>
          <h3><a className="btn" style={{background: '#fff', padding: '7px 14px'}}><i className="fa fa-laptop" /> Add a Pub Server</a></h3>
        </div>
      </div>
    </VerticalFilledContainer>
  }
}