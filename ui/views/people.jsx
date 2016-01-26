'use babel'
import React from 'react'
import pull from 'pull-stream'
import UserSummary from '../com/user/summary'
import Tabs from '../com/tabs'
import { VerticalFilledContainer } from '../com/index'
import LeftNav from '../com/leftnav'
import social from '../lib/social-graph'
import u from '../lib/util'

const TAB_OPTS = [
  { label: 'Friends' },
  { label: 'People you follow' },
  { label: 'Flagged' },
  { label: 'Others' }
]
const FRIENDS_TAB = TAB_OPTS[0]
const FOLLOWED_TAB = TAB_OPTS[1]
const FLAGGED_TAB = TAB_OPTS[2]
const OTHERS_TAB = TAB_OPTS[3]

export default class People extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      users: [],
      currentTab: FRIENDS_TAB
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

  selectTab(tab) {
    this.setState({ currentTab: tab })
  }

  filter(user) {
    if (this.state.currentTab === FRIENDS_TAB)
      return user.following && user.follower
    if (this.state.currentTab === FOLLOWED_TAB)
      return user.following && !user.follower
    if (this.state.currentTab === FLAGGED_TAB)
      return user.flagged
    if (this.state.currentTab === OTHERS_TAB)
      return !user.following && !user.follower && !user.flagged
  }

  render() {
    return <VerticalFilledContainer id="people" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill">
        <div className="user-summaries">
          <Tabs options={TAB_OPTS} selected={this.state.currentTab} onSelect={this.selectTab.bind(this)} />
          <div>{ this.state.users.filter(this.filter.bind(this)).map(user => <UserSummary key={user.id} pid={user.id} />) }</div>
        </div>
      </div>
    </VerticalFilledContainer>
  }
}