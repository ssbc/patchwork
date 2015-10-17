'use babel'
import pull from 'pull-stream'
import React from 'react'
import UserInfo from './user-info'
import { verticalFilled, VerticalFilledContainer, UserLink } from './index'
import app from '../lib/app'
import social from '../lib/social-graph'
import u from '../lib/util'

class UserListItem extends React.Component {
  onClick() {
    this.props.onSelect(this.props.user)
  }
  render() {
    let user = this.props.user
    return <div className={'user-list-item unread summary'+(this.props.selected ? ' selected' : '')} onClick={this.onClick.bind(this)}>
      <div className="header">
        <div className="header-left"><UserLink id={user.id} /></div>
        <div className="header-right">
          { user.followed && user.follows  ? <small>Friends</small> : '' }
          { user.followed && !user.follows ? <small>Following</small> : '' }
          { !user.followed && user.follows ? <small>Follows you</small> : '' }
        </div>
      </div>
      <div className="body">
        Followed by {user.nfollowers} {user.nfollowers==1?'person':'people'} you follow
      </div>
    </div>
  }
}

class UserListItems extends React.Component {
  render() {
    let isEmpty = (this.props.users.length === 0)
    let renderUser = (user, i) => <UserListItem key={i} user={user} selected={user === this.props.selected} onSelect={this.props.onSelect} />
    let isRecommended = user => !user.followed && user.nfollowers > 0 && user.nflaggers === 0
    let isFollowed = user => user.followed
    let isOther = user => !isRecommended(user) && !isFollowed(user)
    return <div className="user-list-items" style={{height: this.props.height, overflow: 'auto'}}>
      <div className="user-list-ctrls">
        <div className="add"><a className="btn" onClick={()=>this.props.onSelect('add')}><i className="fa fa-plus" /></a></div>
        <div className="search">
          <input type="text" placeholder="Search" />
        </div>
      </div>
      { isEmpty ?
        <em ref="container">{this.props.emptyMsg || 'No known users'}</em> :
        <div>
          <h3>Recommended People</h3>
          {this.props.users.filter(isRecommended).map(renderUser)}
          <h3>Followed</h3>
          {this.props.users.filter(isFollowed).map(renderUser)}
          <h3>Others</h3>
          {this.props.users.filter(isOther).map(renderUser)}          
        </div> }
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
        user.nflaggers = social.followedFlaggers(app.user.id, user.id, true).length
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
    return <div className="user-list">
      <UserListItems users={this.state.users} emptyMsg={this.props.emptyMsg} selected={this.state.selected} onSelect={this.handlers.onSelect} />
      <div className="user-list-view">
        { this.state.selected === 'add' ?
          'todo' :
          this.state.selected ? 
            <VerticalFilledContainer><UserInfo pid={this.state.selected.id} /></VerticalFilledContainer> :
            '' }
      </div>
    </div>
  }
}