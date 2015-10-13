import { Router, Route, IndexRoute } from 'react-router'
import Layout from './layout'
import Inbox from './views/inbox'
import Starred from './views/starred'
import Data from './views/data'
import Notifications from './views/notifications'
import People from './views/people'
import Profile from './views/profile'
import Msg from './views/msg'
import WebView from './views/webview'
import Sync from './views/sync'

export default (
  <Router>
    <Route path="/" component={Layout}>
      <IndexRoute component={Inbox} />
      <Route path="starred" component={Starred} />
      <Route path="data" component={Data} />
      <Route path="notifications" component={Notifications} />
      <Route path="people" component={People} />
      <Route path="profile/:id" component={Profile} />
      <Route path="msg/:id" component={Msg} />
      <Route path="webview/:id" component={WebView} />
      <Route path="sync" component={Sync} />
    </Route>
  </Router>
)