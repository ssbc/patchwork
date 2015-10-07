'use babel'
import React from 'react'
import moment from 'moment'
import { Link } from 'react-router'
import app from '../lib/app'
import u from '../lib/util'

export class UserLink extends React.Component {
  render() {
    var name = app.users.names[this.props.id] || u.shortString(this.props.id, 6)
    return <Link to={'/profile/'+this.props.id} className="user-link">{name}</Link>
  }
}

const startOfDay = moment().startOf('day')
const lastWeek = moment().subtract(1, 'weeks')
const lastYear = moment().subtract(1, 'years')
export class NiceDate extends React.Component {
  render() {
    var d = moment(this.props.ts)
    if (d.isBefore(lastYear))
      d = d.format('')
    else if (d.isBefore(lastWeek))
      d = d.format('MMM D')
    else if (d.isBefore(startOfDay))
      d = d.format('ddd h:mma')
    else
      d = d.format('h:mma')
    return <span>{d}</span>
  }
}