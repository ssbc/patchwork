import { Router, Route, Link } from 'react-router'
import Layout from './layout'
import Inbox from './views/inbox'

export default (
  <Router>
    <Route path="/" component={Layout}>
      <Route path="*" component={Inbox} />
    </Route>
  </Router>
)