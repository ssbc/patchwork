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
    const verticalCenteringStyles = {
      position: 'absolute',
      left: 0,
      top: '36%',
      transform: 'translateY(-50%)',
      width: '100%'
    }
    return <div className="text-center" style={verticalCenteringStyles}>
      <h1>Welcome to {rainbow('Patchwork')}</h1>
      <h3>Connect with friends and family on a peer-to-peer network.</h3>
    </div>
  }
}