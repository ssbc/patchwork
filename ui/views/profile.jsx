'use babel'
import React from 'react'
import VerticalFilledContainer from 'patchkit-vertical-filled'
import UserView from '../com/user/view'

export default class Profile extends React.Component {
  render() {
    const pid = (this.props.params.id) ? decodeURIComponent(this.props.params.id) : false
    return <div id="profile"><UserView pid={pid} location={this.props.location} /></div>
  }
}