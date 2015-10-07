'use babel'
import React from 'react'
import { FriendsHexagrid } from '../com/hexagons'

export default class Friends extends React.Component {
  render() {
    return <div className="friends"><FriendsHexagrid size="80" nrow="10" uneven /></div>
  }
}