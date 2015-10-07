'use babel'
import React from 'react'

export default class Profile extends React.Component {
  render() {
    return <div>{this.props.params.splat}</div>
  }
}