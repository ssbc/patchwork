'use babel'
import React from 'react'
import pull from 'pull-stream'
import { Link } from 'react-router'
import { VerticalFilledContainer } from '../com/index'
import UserSummary from '../com/user/summary'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import FollowNearby from '../com/forms/follow-nearby'
import FollowFoafs from '../com/forms/follow-foafs'
import PubInvite from '../com/forms/pub-invite'
import ModalSingle from '../com/modals/single'
import InputPlaque from '../com/form-elements/input-plaque'
import social from '../lib/social-graph'
import app from '../lib/app'

export default class Pubs extends React.Component {
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
      <div className="user-add" onClick={this.onOpenModal.bind(this)}>
        <div><i className="fa fa-laptop" /></div>
        <div className="name">Join a Pub</div>
      </div>
      { this.state.pubs.map(id => <UserSummary key={id} pid={id} />) }
    </div>
  }
}

export default class AddContact extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    return <VerticalFilledContainer id="add-contact" className="flex">
      <LeftNav location={this.props.location} />
      <div className="flex-fill">
        { '' /* TODO <div className="section">
          <h1>Add Contact</h1>
          <InputPlaque label="Contact's Address" placeholder="Enter your contact's address here to send an intro request" btn={<span><i className="fa fa-user-plus" /> Send Request</span>} />
        </div> */ }
        <div className="section"><FollowNearby /></div>
        <div className="section"><Pubs /></div>
        <div className="section"><FollowFoafs /></div>
      </div>
      <RightNav/>
    </VerticalFilledContainer>
  }
}