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
    this.state = {
      users: [], 
      filters: { following: true, follower: false, flagged: false }
    }
  }

  componentDidMount() {
    // load feed data
    pull(
      app.ssb.latest(),
      pull.map((user) => {
        user.name      = u.getName(user.id)
        user.isUser    = user.id === app.user.id
        user.following = social.follows(app.user.id, user.id)
        user.follower  = social.follows(user.id, app.user.id)
        user.flagged   = social.flags(app.user.id, user.id)
        return user
      }),
      pull.collect((err, users) => {
        if (err)
          return app.minorIssue('An error occurred while fetching known users', err)

        users.sort(function (a, b) {
          return a.name.localeCompare(b.name)
        })
        this.setState({ users: users })
      })
    )
  }

  toggleFilter(filter) {
    this.state.filters[filter] = !this.state.filters[filter]
    this.setState(this.state)
  }

  filter(user) {
    const f = this.state.filters
    if (f.following && !user.following)
      return false
    if (f.follower && !user.follower)
      return false
    if (f.flagged && !user.flagged)
      return false
    return true
  }

  render() {
    const FilterCheckbox = props => {
      const onClick = () => this.toggleFilter(props.for)
      return <label><input type="checkbox" onClick={onClick} checked={this.state.filters[props.for]} /> {props.children}</label>
    }
    return <VerticalFilledContainer id="people" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill user-summaries">
        <div className="filters flex">
          <div>Show Only:</div>
          <FilterCheckbox for="following">Following</FilterCheckbox>
          <FilterCheckbox for="follower">Follows You</FilterCheckbox>
          <FilterCheckbox for="flagged">Flagged By You</FilterCheckbox>
        </div>
        { this.state.users.filter(this.filter.bind(this)).map(user => <UserSummary key={user.id} pid={user.id} />) }
      </div>
    </VerticalFilledContainer>
  }
}