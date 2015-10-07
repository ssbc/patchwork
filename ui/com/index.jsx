'use babel'
import React from 'react'
import { Link } from 'react-router'

export class UserLink extends React.Component {
  render() {
    return <Link to="/profile/bob" className="user-link">Bob</Link>
  }
}