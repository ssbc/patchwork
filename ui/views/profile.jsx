'use babel'
import React from 'react'
import { VerticalFilledContainer } from '../com'
import LeftNav from '../com/leftnav'
import UserView from '../com/user/view'

export default class Profile extends React.Component {
  render() {
    const pid = (this.props.params.id) ? decodeURIComponent(this.props.params.id) : false
    return <VerticalFilledContainer id="profile" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill"><UserView pid={pid} /></div>
    </VerticalFilledContainer>
  }
}