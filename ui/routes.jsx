import { Router, Route, IndexRoute } from 'react-router'
import Layout from './layout'
import Inbox from './views/inbox'
import Profile from './views/profile'

export default (
  <Router>
    <Route path="/" component={Layout}>
      <IndexRoute component={Inbox} />
      <Route path="profile/:userId" component={Profile} />
    </Route>
  </Router>
)