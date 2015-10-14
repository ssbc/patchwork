'use babel'
import pull from 'pull-stream'
import React from 'react'
import UserInfo from './user-info'
import { verticalFilled, UserLink } from './index'
import app from '../lib/app'
import social from '../lib/social-graph'
import u from '../lib/util'

class UserListItem extends React.Component {
  onClick() {
    this.props.onSelect(this.props.user)
  }
  render() {
    let user = this.props.user
    return <div className={'msg-list-item unread summary'+(this.props.selected ? ' selected' : '')} onClick={this.onClick.bind(this)}>
      <div className="header">
        <div className="header-left"><UserLink id={user.id} /></div>
        <div className="header-right">
        </div>
      </div>
      <div className="body">
        Followed by {user.nfollowers} people you follow<br/>
        { user.followed && user.follows  ? <small><i className="fa fa-check" /> Friends</small> : '' }
        { user.followed && !user.follows ? <small><i className="fa fa-check" /> Following</small> : '' }
        { !user.followed && user.follows ? <small><i className="fa fa-frown-o" /> Follows you</small> : '' }
      </div>
    </div>
  }
}

class UserListItems extends React.Component {
  render() {
    let isEmpty = (this.props.users.length === 0)
    return <div className="msg-list-items" style={{height: this.props.height, overflow: 'auto'}}>
      <div className="msg-list-ctrls">
        <div className="add"><a className="btn" onClick={()=>this.props.onSelect('add')}><i className="fa fa-plus" /></a></div>
        <div className="search">
          <input type="text" placeholder="Search" />
        </div>
      </div>
      { isEmpty ?
        <em ref="container">{this.props.emptyMsg || 'No known users'}</em> :
        this.props.users.map((user, i) => {
          return <UserListItem key={i} user={user} selected={user === this.props.selected} onSelect={this.props.onSelect} />
        }) }
    </div>
  }
}
UserListItems = verticalFilled(UserListItems)

export default class UserList extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      users: [],
      selected: null
    }

    // handlers
    this.handlers = {
      onSelect: (user) => {
        // deselect toggle
        if (this.state.selected === user)
          return this.setState({ selected: false })

        // update UI
        this.setState({ selected: user })
      }
    }
  }

  componentDidMount() {
    // load feed data
    pull(
      app.ssb.latest(),
      pull.filter((user) => user.id !== app.user.id),
      pull.map((user) => {
        user.name = u.getName(user.id)
        user.nfollowers = social.followedFollowers(app.user.id, user.id).length
        user.followed = social.follows(app.user.id, user.id)
        user.follows = social.follows(user.id, app.user.id)
        return user
      }),
      pull.collect((err, users) => {
        if (err)
          return app.minorIssue('An error occurred while fetching known users', err)

        users.sort(function (a, b) {
          return b.nfollowers - a.nfollowers
        })
        this.setState({ users: users })
      })
    )
  }

  render() {
    return <div className="msg-list">
      <UserListItems users={this.state.users} emptyMsg={this.props.emptyMsg} selected={this.state.selected} onSelect={this.handlers.onSelect} />
      <div className="msg-list-view">
        { this.state.selected === 'add' ?
          'todo' :
          this.state.selected ? 
            ''  :
            '' }
      </div>
    </div>
  }
}