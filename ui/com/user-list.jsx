'use babel'
import pull from 'pull-stream'
import React from 'react'
import UserProfile from './user-profile'
import { ContactsTips } from './help/cards'
import { verticalFilled, VerticalFilledContainer, UserLink, UserPic } from './index'
import app from '../lib/app'
import social from '../lib/social-graph'
import u from '../lib/util'

class UserListItem extends React.Component {
  onClick() {
    this.props.onSelect(this.props.user)
  }
  shouldComponentUpdate(nextProps) {
    return this.props.selected !== nextProps.selected
  }
  render() {
    let user = this.props.user
    return <div className={'user-list-item unread summary'+(this.props.selected ? ' selected' : '')} onClick={this.onClick.bind(this)}>
      <UserPic id={user.id} />
      <div className="header">
        <div className="header-left"><UserLink id={user.id} /></div>
        <div className="header-right">
          { user.isUser                    ? <small>You</small> : '' }
          { user.followed && user.follows  ? <small>Friends</small> : '' }
          { user.followed && !user.follows ? <small>Following</small> : '' }
          { !user.followed && user.follows ? <small>Follows you</small> : '' }
        </div>
      </div>
      <div className="body">
        {user.nfollowers} {user.nfollowers==1?'follower':'followers'}
      </div>
    </div>
  }
}

class UserListItems extends React.Component {
  constructor(props) {
    super(props)
    this.state = { searchText: '', searchQuery: false }
  }

  onSearchChange(e) {
    const v = e.target.value
    this.setState({ searchText: v, searchQuery: (v) ? new RegExp(v, 'i') : false })
  }

  render() {
    let renderUser = (user, i) => <UserListItem key={user.id} user={user} selected={user.id === this.props.selected} onSelect={this.props.onSelect} />
    let isSearchMatch = user => (this.state.searchQuery) ? this.state.searchQuery.test(u.getName(user.id)) : true
    let isSelf = user => (user.id === app.user.id)
    let isFollowed = user => (!isSelf(user) && user.followed)
    let isOther = user => (!isSelf(user) && !isFollowed(user))
    return <div className="user-list-items" style={{height: this.props.height, overflow: 'auto'}}>
      <div className="user-list-ctrls">
        <div className="search">
          <input type="text" placeholder="Filter" value={this.state.searchText} onChange={this.onSearchChange.bind(this)} />
        </div>
      </div>
      {this.props.users.filter(isSelf).filter(isSearchMatch).map(renderUser)}
      {this.props.users.filter(isFollowed).filter(isSearchMatch).map(renderUser)}
      {this.props.users.filter(isOther).filter(isSearchMatch).map(renderUser)} 
      <ContactsTips />
    </div>
  }
}
UserListItems = verticalFilled(UserListItems)

export default class UserList extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      users: []
    }

    // handlers
    this.handlers = {
      onSelect: (user) => {
        app.history.pushState(null, '/profile/'+encodeURIComponent(user.id))
      }
    }
  }

  componentDidMount() {
    // load feed data
    pull(
      app.ssb.latest(),
      pull.map((user) => {
        user.name = u.getName(user.id)
        user.isUser = user.id === app.user.id
        user.nfollowers = social.followers(user.id).length
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
    const selected = this.props.selected||app.user.id
    return <div className="user-list">
      <UserListItems users={this.state.users} emptyMsg={this.props.emptyMsg} selected={selected} onSelect={this.handlers.onSelect} />
      <div className="user-list-view">
        <UserProfile pid={selected} />
      </div>
    </div>
  }
}