'use babel'
import React from 'react'
import pull from 'pull-stream'
import UserSummary from '../user/summary'
import social from '../../lib/social-graph'
import app from '../../lib/app'

export default class FollowFoafs extends React.Component {
  constructor(props) {
    super(props)
    this.state ={
      pubs: [] // array of IDs
    }
  }
  componentDidMount() {    
    // get followeds
    pull(
      app.ssb.friends.createFriendStream({ hops: 1 }),
      pull.filter(id => {
        // filter down to pubs
        return id !== app.user.id && !social.follows(app.user.id, id) && !social.flags(app.user.id, id)
      }),
      pull.collect((err, ids) => {
        if (err)
          return app.minorIssue('An error occurred while fetching users', err)
        ids.sort((a, b) => social.followers(b).length - social.followers(a).length)
        this.setState({ foafs: ids })
      })
    )
  }

  render() {
    const foafs = this.state.foafs
    if (foafs.length === 0)
      return <div/>
    return <div>
      <h1>Friends of Friends</h1>
      <h3 style={{marginTop: 5}}>Potential contacts from your social network.</h3>
      { foafs.map(id => <UserSummary key={id} pid={id} />) }
    </div>
  }
}