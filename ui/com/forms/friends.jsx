'use babel'
import React from 'react'
import { rainbow } from '../index'
import app from '../../lib/app'

export default class Friends extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
    }
  }

  componentDidMount() {
    this.props.setIsReady(true)
    this.props.setIsValid(true)
  }

  submit(cb) {
    // TODO
  }

  render() {
    return <div>
      <h1>Find {rainbow('Friends')}</h1>
    </div>
  }
}