'use babel'
import React from 'react'
import UserList from '../com/user-list'

export default class People extends React.Component {
  render() {
    return <div id="people"><UserList /></div>
  }
}