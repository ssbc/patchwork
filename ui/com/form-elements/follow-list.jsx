'use babel'
import React from 'react'
import app from '../../lib/app'
import social from '../../lib/social-graph'
import u from '../../lib/util'

export default class FollowList extends React.Component {
  render() {
    return <div className="follow-list">
      {this.props.ids.map((id, i) => {
        return <div key={i} className="follow-list-user" onClick={()=>this.props.onClick(id)}>
          <div><div className="checkbox">{ this.props.following.has(id) ? <i className="fa fa-check" /> : '' }</div></div>
          <div><img src={u.profilePicUrl(id)} /></div>
          <div><div className="name">{app.users.names[id] || <em>no name assigned</em>}</div><div className="id">{id}</div></div>
        </div>
      })}
    </div>
  }
}