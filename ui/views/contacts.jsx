'use babel'
import React from 'react'
import pull from 'pull-stream'
import ip from 'ip'
import { Link } from 'react-router'
import VerticalFilledContainer from 'patchkit-vertical-filled'
import { UserSummaries } from '../com/user/summary'
import LeftNav from '../com/leftnav'
import RightNav from '../com/rightnav'
import PubInvite from 'patchkit-form-pub-invite'
import ModalSingle from 'patchkit-modal/single'
import u from 'patchkit-util'
import social from 'patchkit-util/social'
import app from '../lib/app'
import t from 'patchwork-translations'

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
        return id !== app.user.id && social.follows(app.users, id, app.user.id) && isPub(id)
      }),
      pull.collect((err, ids) => {
        if (err)
          return app.minorIssue(t("error.fetchUsers"), err)

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
      <h1>{t('YourPubs')}</h1>
      <h3 style={{marginTop: 5}}>
      {t('pubs.connect')}
        { npubs === 0
          ? t('pubs.joinOne')
          : t('pubs.joinMore') }
      </h3>
      <ModalSingle className="fullheight" Form={PubInvite} nextLabel={t('Join')} isOpen={this.state.isModalOpen} onClose={this.onCloseModal.bind(this)} />
      <UserSummaries ids={this.state.pubs} onClickJoinPub={this.onOpenModal.bind(this)} />
    </div>
  }
}

// peers on the wifi
class FollowNearby extends React.Component {
  constructor(props) {
    super(props)
    this.state ={
      foundNearbyPeers: [] // array of IDs
    }
  }
  componentDidMount() {
    // update peers after a delay
    // (use a delay so the user sees the app "scanning")
    this.onPeersUpdate = () => {
      var peers = new Set()
      app.peers
        .filter(p => !ip.isLoopback(p.host) && ip.isPrivate(p.host))
        .filter(p => !social.flags(app.users, app.user.id, p.key))
        .forEach(p => peers.add(p.key))
      peers = [...peers]
      this.setState({ foundNearbyPeers: peers })

      // HACK
      // I want names to show up on these peers, and the local peers may still be replicating messages
      // so I'm having the app refresh its state every time the peers have polled
      // a better solution would be to have the backend state in sync with frontend through a continuous 'change' stream
      // but that's a future project
      // -prf
      app.fetchLatestState()
    }
    this.onPeersUpdate()
    app.on('update:peers', this.onPeersUpdate)
  }

  componentWillUnmount() {
    app.removeListener('update:peers', this.onPeersUpdate)
  }

  render() {
    const peers = this.state.foundNearbyPeers
    const hasPeers = (peers.length > 0)
    return <div>
      <h1>{t('Nearby')}</h1>
      <h3 style={{marginTop: 5}}>{ hasPeers ? t('peers.found'): t('peers.none') }</h3>
      <UserSummaries ids={peers} />
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
    var friends = social.friends(app.users, app.user.id)
    friends.sort(function (a, b) {
      // sort alphabetically
      return u.getName(app.users, a).localeCompare(u.getName(app.users, b))
    })
    this.setState({ friends })
  }

  render() {
    return <div className="user-summaries">
      <h1>{t('Friends')}</h1>
      <h3>{t('FriendsInfo')}</h3>
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
    var follows = social.followeds(app.users, app.user.id).filter(id => {
      // remove self and mutual followers
      return !social.follows(app.users, id, app.user.id)
    })
    follows.sort(function (a, b) {
      // sort alphabetically
      return u.getName(app.users, a).localeCompare(u.getName(app.users, b))
    })
    this.setState({ follows })
  }

  render() {
    return <div className="user-summaries">
      <h1>{t('Following')}</h1>
      <h3>(t('FollowingInfo')}</h3>
      <UserSummaries ids={this.state.follows} />
    </div>
  }
}

class FollowFoafs extends React.Component {
  constructor(props) {
    super(props)
    this.state ={
      foafs: [] // array of IDs
    }
  }
  componentDidMount() {    
    // get foafs
    var hits = {}
    pull(
      app.ssb.friends.createFriendStream({ hops: 2 }),
      pull.filter(id => {
        // remove already-followed, flagged, self, duplicates, and users w/o names and pics
        if (hits[id]) return false
        hits[id] = true
        return id !== app.user.id
          && !!app.users.names[id]
          && !!u.getProfilePic(app.users, id)
          && !social.follows(app.users, app.user.id, id)
          && !social.flags(app.users, app.user.id, id)
      }),
      pull.collect((err, ids) => {
        if (err)
          return app.minorIssue(t('error.fetchUsers'), err)
        ids.sort((a, b) => social.followers(app.users, b).length - social.followers(app.users, a).length)
        this.setState({ foafs: ids })
      })
    )
  }

  render() {
    const foafs = this.state.foafs
    if (foafs.length === 0)
      return <div/>
    return <div>
      <h1>{t('FriendsOfFriends')}</h1>
      <h3 style={{marginTop: 5}}>{t('FriendsOfFriendsInfo')}</h3>
      <UserSummaries ids={foafs} />
    </div>
  }
}

// is `id` a pub?
function isPub (id) {
  // try to find the ID in the peerlist, and see if it's a public peer if so
  for (var i=0; i < app.peers.length; i++) {
    var peer = app.peers[i]
    if (peer.key === id && !ip.isPrivate(peer.host))
      return true
  }
  return false
}