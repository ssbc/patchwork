import { Router, Route, IndexRoute } from 'react-router'
import Layout from './layout'
import Forum from './views/forum'
import Inbox from './views/inbox'
import Starred from './views/starred'
import Friends from './views/friends'
import Feed from './views/feed'
import Profile from './views/profile'

export default (
  <Router>
    <Route path="/" component={Layout}>
      <IndexRoute component={Forum} />
      <Route path="inbox" component={Inbox} />
      <Route path="starred" component={Starred} />
      <Route path="friends" component={Friends} />
      <Route path="feed" component={Feed} />
      <Route path="profile/:userId" component={Profile} />
    </Route>
  </Router>
)