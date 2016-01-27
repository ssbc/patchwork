'use babel'
import React from 'react'
import { rainbow } from '../index'

export default class WelcomePage extends React.Component {
  componentDidMount() {
    this.props.setIsReady(true)
    this.props.setIsValid(true)
  }
  submit(cb) {
    cb()
  }
  render() {
    return <div className="text-center vertical-center">
      <h1>Welcome to {rainbow('Patchwork')}</h1>
      <h3>{"Let's"} get started.</h3>
    </div>
  }
}