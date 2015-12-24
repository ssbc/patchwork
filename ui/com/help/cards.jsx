'use babel'
import React from 'react'
import { Link } from 'react-router'
import PubInvite from '../forms/pub-invite'
import ModalBtn from '../modals/btn'
import app from '../../lib/app'

export class NewsFeed extends React.Component {
  render() {
    return <div className="card">
      <h2><i className="fa fa-newspaper-o" /> Newsfeed</h2>
      <p>Public conversations and content in your network.</p>
    </div>
  }
}

export class Notifications extends React.Component {
  render() {
    return <div className="card">
      <h2><i className="fa fa-rss" /> Updates</h2>
      <p>See when people follow you, like your posts, or mention you in a message.</p>
    </div>
  }
}

export class Inbox extends React.Component {
  render() {
    return <div className="card">
      <h2><i className="fa fa-inbox" /> Inbox</h2>
      <p>Private, encrypted messages between you and your contacts.</p>
    </div>
  }
}

export class Bookmarks extends React.Component {
  render() {
    return <div className="card">
      <h2><i className="fa fa-bookmark-o" /> Bookmarked</h2>
      <p>{"Posts you've bookmarked by pressing the "}<i className="fa fa-bookmark-o" /> button. Bookmarks are not shared with the network.</p>
    </div>
  }
}

export class ContactsTips extends React.Component {
  render() {
    return <div style={{fontWeight: 'normal', color: 'gray', padding: '0 10px'}}>
      <p><small>{"Can't find somebody? Try joining their pub, or getting on the same WiFi as them."}</small></p>
      <p><small>{"If you have a friend's ID, put it in the search box above."}</small></p>
    </div>
  }
}

export class Pubs extends React.Component {
  render() {
    if (!app.isWifiMode)
      return <span/>
    return <div className="card">
      <h2>{"You're in WiFi mode."}</h2>
      <p>To reach the global network, you need to be followed by a Public Peer.</p>
      <div className="card-well">
        <ModalBtn className="btn fullheight" Form={PubInvite} nextLabel="Submit"><i className="fa fa-cloud"/> Add Public Peer</ModalBtn>
      </div>
    </div>
  }
}

export class FindingUsers extends React.Component {
  render() {
    return <div className="card">
      <h2>Looking for Someone?</h2>
      <p>Find other users in the <Link to="/profile">Contacts</Link> view.</p>
    </div>
  }
}