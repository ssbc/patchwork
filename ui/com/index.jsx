'use babel'
import React from 'react'
import ReactDOM from 'react-dom'
import { Link } from 'react-router'
import Modal from 'react-modal'
import xtend from 'xtend'
import TimeAgo from 'react-timeago'
import app from '../lib/app'
import social from '../lib/social-graph'
import u from '../lib/util'

export class UserLink extends React.Component {
  render() {
    const name = app.users.names[this.props.id] || u.shortString(this.props.id, 6)
    const label = (this.props.shorten) ? name.slice(0, 3) : name
    return <Link to={'/profile/'+encodeURIComponent(this.props.id)} className="user-link" title={name}>{label}</Link>
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

export class UserLinks extends React.Component {
  render() {
    let n = this.props.ids.length
    return <span>
      {this.props.ids.map((id, i) => {
        let isLast = (i === n-1)
        return <span key={id} ><UserLink id={id} shorten={this.props.shorten} />{isLast ? '' : ', '}</span>
      })}
    </span>
  }
}

export class UserPic extends React.Component {
  render() {
    var name = app.users.names[this.props.id] || u.shortString(this.props.id, 6)
    return <Link to={'/profile/'+encodeURIComponent(this.props.id)} className="user-pic" title={name}>
      <img src={u.profilePicUrl(this.props.id)} />
    </Link>
  }
}

export class UserBtn extends React.Component {
  render() {
    const name = app.users.names[this.props.id] || u.shortString(this.props.id, 6)
    const followedIcon = (app.user.id === this.props.id || social.follows(app.user.id, this.props.id))
      ? <i className="fa fa-check-circle" />
      : <i className="fa fa-circle-thin" />
    return <Link to={'/profile/'+encodeURIComponent(this.props.id)} className="user-btn" title={name}>
      <img src={u.profilePicUrl(this.props.id)} /> {name} {followedIcon}
    </Link>
  }
}

export class NiceDate extends React.Component {
  render() {
    return <span>{u.niceDate(this.props.ts)}</span>
  }
}

export class LastSeen extends React.Component {
  render() {
    const isRecent = new Date - this.props.ts < 60000
    return <span>
      {isRecent ? 'moments ago' : <TimeAgo date={this.props.ts} />}
    </span>
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
        var rect = ReactDOM.findDOMNode(this.refs.el).getClientRects()[0]
        if (!rect)
          return
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
class _VerticalFilledContainer extends React.Component {
  render() {
    return <div {...this.props} style={{height: this.props.height, overflow: 'auto'}}>{this.props.children||''}</div>
  }
}
export var VerticalFilledContainer = verticalFilled(_VerticalFilledContainer)
