'use babel'
import React from 'react'
import { Link } from 'react-router'

export default class TopNav extends React.Component {

  render() {
    return <div id="topnav">
      <Link to="/composer">Compose</Link>{' '}
      <Link to="/sync">Sync</Link>
    </div>
  }
}