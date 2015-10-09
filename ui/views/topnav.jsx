'use babel'
import React from 'react'
import { Link } from 'react-router'
import Issues from '../com/issues'

export default class TopNav extends React.Component {

  render() {
    return <div id="topnav">
      <Link to="/composer">Compose</Link>{' '}
      <Issues />{' '}
      <Link to="/sync">Sync</Link>
    </div>
  }
}