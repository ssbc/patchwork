'use babel'
import React from 'react'
import moment from 'moment'
import { Link } from 'react-router'
import app from '../lib/app'
import u from '../lib/util'

export class UserLink extends React.Component {
  render() {
    var name = app.users.names[this.props.id] || u.shortString(this.props.id, 6)
    return <Link to={'/profile/'+encodeURIComponent(this.props.id)} className="user-link">{name}</Link>
  }
}

export class MsgLink extends React.Component {
  render() {
    return <Link to={'/msg/'+encodeURIComponent(this.props.id)}>{this.props.name||this.props.id}</Link>
  }
}

export class BlobLink extends React.Component {
  render() {
    return <Link to={'/webview/'+encodeURIComponent(this.props.id)}>{this.props.name||this.props.id}</Link>
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

// higher-order component, adds vertical-filling behavior (take all vertical space possible)
export function verticalFilled (Component) {
  const VerticalFilledCom = React.createClass({
    getInitialState() {
      return { height: window.innerHeight }
    },
    componentDidMount() {
      this.calcHeight()
      this.resizeListener = this.calcHeight
      window.addEventListener('resize', this.resizeListener)
    },
    componentWillUnmount() {
      window.removeEventListener('resize', this.resizeListener)
    },
    calcHeight() {
      var height = window.innerHeight
      if (this.refs && this.refs.el) {
        var rect = React.findDOMNode(this.refs.el).getClientRects()[0]
        height = window.innerHeight - rect.top
      }
      this.setState({ height: height })
    },
    render() {
      return <Component ref="el" {...this.props} {...this.state} />
    }
  })
  return VerticalFilledCom;
}