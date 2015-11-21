'use babel'
import React from 'react'
import UserList from '../com/user-list'

export default class Profile extends React.Component {
  render() {
    const pid = (this.props.params.id) ? decodeURIComponent(this.props.params.id) : false
    return <div id="profile"><UserList selected={pid} /></div>
  }
}