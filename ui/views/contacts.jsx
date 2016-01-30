'use babel'
import React from 'react'
import pull from 'pull-stream'
import UserSummary from '../com/user/summary'
import { VerticalFilledContainer, UserPic } from '../com/index'
import LeftNav from '../com/leftnav'
import social from '../lib/social-graph'
import u from '../lib/util'

export default class Contacts extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      contacts: [],
      pendings: []
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
          // remove non-contacts
          return social.follows(id, app.user.id) && id !== app.user.id
        })
        contacts.sort(function (a, b) {
          return u.getName(a).localeCompare(u.getName(b))
        })
        var pendings = users.filter(id => {
          // remove contacts
          return !social.follows(id, app.user.id) && id !== app.user.id
        })
        this.setState({ contacts, pendings })
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
    return <VerticalFilledContainer id="contacts" className="flex" style={{position: 'relative'}}>
      <LeftNav location={this.props.location} />
      <div className="flex-fill">
        <div className="user-summaries">
          { this.state.pendings.length > 0
            ? <div className="pending">
              <h2>Pending</h2>
              { this.state.pendings.map(id => <UserPic key={id} id={id} />) }
            </div>
            : '' }
          <div className="user-add" onClick={this.onClickAddFriend.bind(this)}>
            <div><i className="fa fa-user-plus" /></div>
            <div className="name">Add Contact</div>
          </div>
          <UserSummary pid={app.user.id} />
          { this.state.contacts.map(id => <UserSummary key={id} pid={id} />) }
        </div>
      </div>
    </VerticalFilledContainer>
  }
}