'use babel'
import React from 'react'
import UserSummary from '../com/user/summary'
import { VerticalFilledContainer } from '../com/index'
import LeftNav from '../com/leftnav'
import social from '../lib/social-graph'
import u from '../lib/util'

export default class Profile extends React.Component {
  constructor(props) {
    super(props)
    this.state = { users: [] }
  }

  componentDidMount() {
    // load feed data
    pull(
      app.ssb.latest(),
      pull.map((user) => {
        user.name = u.getName(user.id)
        user.isUser = user.id === app.user.id
        user.isFollowing = social.follows(app.user.id, user.id)
        user.followsYou = social.follows(user.id, app.user.id)
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
    // predicates
    const isUser = user => user.isUser
    const isFriend = user => !user.isUser && (user.isFollowing && user.followsYou)
    const isFollowing = user => !user.isUser && (user.isFollowing && !user.followsYou)
    const isFollower = user => !user.isUser && (!user.isFollowing && user.followsYou)
    const isOther = user => !user.isUser && (!user.isFollowing && !user.followsYou)

    const group = pred => this.state.users.filter(pred).map((user, i) => <UserSummary key={i} pid={user.id} />)
    return <VerticalFilledContainer id="people" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill user-summaries">
        <h1>You</h1>
        { group(isUser) }
        <h1>Friends</h1>
        { group(isFriend) }
        <h1>Following</h1>
        { group(isFollowing) }
        <h1>Followers</h1>
        { group(isFollower) }
        <h1>Other</h1>
        { group(isOther) }
      </div>
    </VerticalFilledContainer>
  }
}