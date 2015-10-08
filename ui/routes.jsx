import { Router, Route, IndexRoute } from 'react-router'
import Layout from './layout'
import Posts from './views/posts'
import Inbox from './views/inbox'
import Starred from './views/starred'
import Data from './views/data'
import Profile from './views/profile'

export default (
  <Router>
    <Route path="/" component={Layout}>
      <IndexRoute component={Posts} />
      <Route path="inbox" component={Inbox} />
      <Route path="starred" component={Starred} />
      <Route path="data" component={Data} />
      <Route path="profile/:id" component={Profile} />
    </Route>
  </Router>
)