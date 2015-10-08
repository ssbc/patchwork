import { Router, Route, IndexRoute } from 'react-router'
import Layout from './layout'
import Inbox from './views/inbox'
import Starred from './views/starred'
import Data from './views/data'
import Profile from './views/profile'
import Msg from './views/msg'
import WebView from './views/webview'
import Composer from './views/composer'

export default (
  <Router>
    <Route path="/" component={Layout}>
      <IndexRoute component={Inbox} />
      <Route path="starred" component={Starred} />
      <Route path="data" component={Data} />
      <Route path="profile/:id" component={Profile} />
      <Route path="msg/:id" component={Msg} />
      <Route path="webview/:id" component={WebView} />
      <Route path="composer" component={Composer} />
    </Route>
  </Router>
)