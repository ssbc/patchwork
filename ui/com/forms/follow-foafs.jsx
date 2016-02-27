'use babel'
import React from 'react'
import pull from 'pull-stream'
import { UserSummaries } from '../user/summary'
import social from '../../lib/social-graph'
import app from '../../lib/app'
import u from '../../lib/util'

export default class FollowFoafs extends React.Component {
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
        return id !== app.user.id && !!app.users.names[id] && !!u.profilePic(id) && !social.follows(app.user.id, id) && !social.flags(app.user.id, id)
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
      <UserSummaries ids={foafs} />
    </div>
  }
}