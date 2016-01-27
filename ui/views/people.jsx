'use babel'
import React from 'react'
import pull from 'pull-stream'
import UserSummary from '../com/user/summary'
import { VerticalFilledContainer } from '../com/index'
import LeftNav from '../com/leftnav'
import social from '../lib/social-graph'
import u from '../lib/util'

export default class People extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      users: []
    }
  }

  componentDidMount() {
    // get all followed
    pull(
      app.ssb.friends.createFriendStream({ hops: 1 }),
      pull.filter(id => {
        // remove non-friends
        return social.follows(id, app.user.id)
      }),
      pull.map(id => {
        return {
          id:        id,
          name:      u.getName(id),
          isUser:    id == app.user.id
        }
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

  onClickAddFriend() {
    app.history.pushState(null, '/add-friend')
  }

  render() {
    return <VerticalFilledContainer id="people" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill">
        <div className="user-summaries">
          <div>
            <div className="user-add" onClick={this.onClickAddFriend.bind(this)}>
              <div><i className="fa fa-user-plus" /></div>
              <div className="name">Add Contact</div>
            </div>
            { this.state.users.map(user => <UserSummary key={user.id} pid={user.id} />) }
          </div>
        </div>
      </div>
    </VerticalFilledContainer>
  }
}