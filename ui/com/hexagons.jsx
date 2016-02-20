'use babel'
import React from 'react'
import { Link } from 'react-router'
import app from '../lib/app'
import u from '../lib/util'
import social from '../lib/social-graph'

export default class Hexagon extends React.Component {
  render() {
    let img = this.props.url ? 'url('+this.props.url+')' : 'none'
    let size = this.props.size || 30
    return <div className={'hexagon-'+size} data-bg={this.props.url} style={{backgroundImage: img}}>
      <div className="hexTop" />
      <div className="hexBottom" />
    </div>
  }
}

export class UserHexagon extends React.Component {
  render() {
    return <Link className="user-hexagon" to={'/profile/'+this.props.id}><Hexagon url={u.profilePicUrl(this.props.id)} size={this.props.size} /></Link>
  }
}

export class UserHexagrid extends React.Component {
  render() {
    var nrow = this.props.nrow || 3
    var size = this.props.size || 60
    var uneven = (typeof this.props.uneven == 'boolean') ? this.props.uneven : false

    var els = [], row = []
    this.props.ids.forEach(function (id) {
      row.push(<UserHexagon id={id} key={id} size={size} />)
      var n = (uneven && els.length % 2 == 1) ? nrow-1 : nrow
      if (row.length >= n) {
        els.push(<div key={els.length}>{row}</div>)
        row = []
      }
    })
    if (row.length)
      els.push(<div key={els.length}>{row}</div>)

    var cls = 'user-hexagrid-'+size
    if (this.props.horizontal)
      cls += ' horizontal'
    return <div className={cls}>{els}</div>
  }
}

export class FriendsHexagrid extends React.Component {
  constructor(props) {
    super(props)
    this.state = { friends: [] }
  }
  componentDidMount() {
    var friends = []
    friends.push(app.user.id)
    for (var k in app.users.profiles) {
      if (this.props.reverse) {
        if (social.follows(k, app.user.id))
          friends.push(k)
      } else {
        if (social.follows(app.user.id, k))
          friends.push(k)
      }
    }
    this.setState({ friends: friends })
  }
  render() {
    return <UserHexagrid ids={this.state.friends} {...this.props} />
  }
}