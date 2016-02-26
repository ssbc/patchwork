'use babel'
import React from 'react'
import pull from 'pull-stream'
import UserSummary from '../com/user/summary'
import { UserSummaries } from '../com/user/summary'
import { VerticalFilledContainer, UserPic } from '../com/index'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import social from '../lib/social-graph'
import u from '../lib/util'

export default class Contacts extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      contacts: []
    }
  }

  componentDidMount() {
    // get all followed
    pull(
      app.ssb.friends.createFriendStream({ hops: 1 }),
      pull.collect((err, users) => {
        if (err)
          return app.minorIssue('An error occurred while fetching known contacts', err)

        var contacts = users.filter(id => {
          // remove self
          return id !== app.user.id
        })
        contacts.sort(function (a, b) {
          // sort alphabetically
          return u.getName(a).localeCompare(u.getName(b))
        })

        // add the adder button to the contacts list
        contacts.unshift({ addContactBtn: true })
        this.setState({ contacts })
      })
    )
  }

  selectTab(tab) {
    this.setState({ currentTab: tab })
  }

  onClickAddFriend() {
    app.history.pushState(null, '/add-contact')
  }

  render() {
    return <VerticalFilledContainer id="contacts" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill">
        <div className="user-summaries">
          <UserSummaries ids={this.state.contacts} />
        </div>
      </div>
      <RightNav/>
    </VerticalFilledContainer>
  }
}