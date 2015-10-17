'use babel'
import React from 'react'
import { Link } from 'react-router'
import { verticalFilled } from '../com'
import Issues from '../com/issues'
import u from '../lib/util'

class NavLink extends React.Component {
  render() {
    var selected = (this.props.to === this.props.location)
    let content = this.props.children
    if (!content)
      content = <span><i className={'fa fa-'+this.props.icon} /> {this.props.label} {this.props.count ? ' ('+this.props.count+')' : ''}</span>
    return <div className={'leftnav-item '+(selected?'selected':'')}>
      <Link to={this.props.to}>{content}</Link>
    </div>
  }
}

class LeftNav extends React.Component {
  constructor(props) {
    super(props)
    this.state = { indexCounts: app.indexCounts||{} }
    this.onIndexCountsUpdate = () => {
      this.setState({ indexCounts: app.indexCounts })
    }
  }
  componentDidMount() {
    // setup event stream
    app.on('update:indexCounts', this.onIndexCountsUpdate)
  }
  componentWillUnmount() {
    // abort streams
    app.removeListener('update:indexCounts', this.onIndexCountsUpdate)
  }

  nameOf(id) {
    return this.props.names[id] || u.shortString(id||'', 6)
  }
  render() {
    let renderProfLink = (id) => <NavLink key={id} to={'/profile/'+encodeURIComponent(id)} location={this.props.location}><i className="fa fa-user"/> {this.nameOf(id)}</NavLink>

    // nonfriend followings
    let following = ''
    if (this.props.following.length) {
      following = <div>
        <div className="leftnav-item label">Following</div>
        {this.props.following.map(renderProfLink)}
      </div>
    }
    // nonfriend followers
    let followers = ''
    if (this.props.followers.length) {
      followers = <div>
        <div className="leftnav-item label">Followers</div>
        {this.props.followers.map(renderProfLink)}
      </div>
    }

    return <div id="leftnav" style={{height: this.props.height}}>
      <NavLink to="/" location={this.props.location} icon="inbox" label="Inbox" count={this.state.indexCounts.inboxUnread} />
      <NavLink to="/bookmarks" location={this.props.location} icon="bookmark-o" label="Bookmarks" count={this.state.indexCounts.bookmarksUnread} />
      <NavLink to="/people" location={this.props.location}><i className="fa fa-child" /> People</NavLink>
      <div className="leftnav-item label">System</div>
      <NavLink to="/data" location={this.props.location}><i className="fa fa-database" /> Database</NavLink>
      <NavLink to="/sync" location={this.props.location}><i className="fa fa-cloud-download" /> Sync</NavLink>
      <Issues />
      <div className="leftnav-item label">Friends</div>
      {renderProfLink(this.props.userid)}
      {this.props.friends.map(renderProfLink)}
      {following}
      {followers}
    </div>
  }
}
export default verticalFilled(LeftNav)