'use babel'
import React from 'react'
import { UserLink } from '../index'

export default class Oneline extends React.Component {
  render() {
    return <div className="msg-list-item oneline">
      <div><input type="checkbox" /></div>
      <div><UserLink /></div>
      <div>This is the content of the message!</div>
      <div>Oct 13</div>
    </div>
  }
}