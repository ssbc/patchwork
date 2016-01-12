'use babel'
import React from 'react'
import { Link } from 'react-router'
import { VerticalFilledContainer } from '../com/index'
import LeftNav from '../com/leftnav'
import InputPlaque from '../com/form-elements/input-plaque'

export default class AddPub extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return <VerticalFilledContainer id="add-pub" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill">
        <div className="section">
          <h1>Join a Pub Server</h1>
          <h3 style={{marginTop: 5}}>Enter the invite-code below:</h3>
          <InputPlaque label="Pub Invite Code" placeholder="Pub Invite Code" btn={<span><i className="fa fa-laptop" /> Join</span>} />
          <h4>
            <i className="fa fa-question-circle" /> Ask a Pub operator if you can join their Pub. If they say yes, {"they'll"} send you an invite code, which you can use above.<br/>
            <i className="fa fa-info-circle" /> Anybody can create a Pub server (<a href="https://github.com/ssbc/docs" target="_blank">instructions</a>).
          </h4>
        </div>
      </div>
    </VerticalFilledContainer>
  }
}