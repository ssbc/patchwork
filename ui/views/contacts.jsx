'use babel'
import React from 'react'
import pull from 'pull-stream'
import { Link } from 'react-router'
import { VerticalFilledContainer } from '../com/index'
import { UserSummaries } from '../com/user/summary'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import FollowNearby from '../com/forms/follow-nearby'
import FollowFoafs from '../com/forms/follow-foafs'
import PubInvite from '../com/forms/pub-invite'
import ModalSingle from '../com/modals/single'
import InputPlaque from '../com/form-elements/input-plaque'
import social from '../lib/social-graph'
import app from '../lib/app'
import u from '../lib/util'

export default class Contacts extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return <VerticalFilledContainer id="contacts" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill">
        <div className="section"><FollowNearby /></div>
        <div className="section"><Pubs /></div>
        <div className="section"><Friends /></div>
        <div className="section"><Follows /></div>
        <div className="section"><FollowFoafs /></div>
      </div>
      <RightNav/>
    </VerticalFilledContainer>
  }
}

class Pubs extends React.Component {
  constructor(props) {
    super(props)
    this.state = { pubs: [], isModalOpen: false }
  }
  componentDidMount() {
    this.fetch()
  }
  fetch() {    
    // get followeds
    pull(
      app.ssb.friends.createFriendStream({ hops: 1 }),
      pull.filter(id => {
        // filter down to user's pubs
        return id !== app.user.id && social.follows(id, app.user.id) && social.isPub(id)
      }),
      pull.collect((err, ids) => {
        if (err)
          return app.minorIssue('An error occurred while fetching users', err)

        // add join pub btn
        ids.unshift({ joinPubBtn: true })

        this.setState({ pubs: ids })
      })
    )
  }

  onOpenModal() {
    this.setState({ isModalOpen: true })
  }
  onCloseModal(err, completed) {
    this.setState({ isModalOpen: false })
    if (!err && completed)
      app.fetchLatestState(this.fetch.bind(this))
  }

  render() {
    const npubs = this.state.pubs.length
    return <div className="user-summaries">
      <h1>Your Pubs</h1>
      <h3 style={{marginTop: 5}}>
        Pubs connect you with global peers.
        { npubs === 0
          ? " You should join one! (Until you do, you can only talk to people over WiFi.)"
          : " Joining more will increase your reach." }
      </h3>
      <ModalSingle className="fullheight" Form={PubInvite} nextLabel="Join" isOpen={this.state.isModalOpen} onClose={this.onCloseModal.bind(this)} />
      <UserSummaries ids={this.state.pubs} onClickJoinPub={this.onOpenModal.bind(this)} />
    </div>
  }
}

class Friends extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      friends: []
    }
  }

  componentDidMount() {
    var friends = social.contacts(app.user.id)
    friends.sort(function (a, b) {
      // sort alphabetically
      return u.getName(a).localeCompare(u.getName(b))
    })
    this.setState({ friends })
  }

  render() {
    return <div className="user-summaries">
      <h1>Friends</h1>
      <h3>Users you follow, and who follow you back.</h3>
      <UserSummaries ids={this.state.friends} />
    </div>
  }
}

class Follows extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      follows: []
    }
  }

  componentDidMount() {
    var follows = social.followeds(app.user.id).filter(id => {
      // remove self and mutual followers
      return !social.follows(id, app.user.id)
    })
    follows.sort(function (a, b) {
      // sort alphabetically
      return u.getName(a).localeCompare(u.getName(b))
    })
    this.setState({ follows })
  }

  render() {
    return <div className="user-summaries">
      <h1>Following</h1>
      <h3>Users you follow, but who {"don't"} follow you back. They may not see messages from you.</h3>
      <UserSummaries ids={this.state.follows} />
    </div>
  }
}