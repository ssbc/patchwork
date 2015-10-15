import { Router, Route, IndexRoute } from 'react-router'
import Layout from './layout'
import Inbox from './views/inbox'
import Bookmarks from './views/bookmarks'
import Data from './views/data'
import People from './views/people'
import Profile from './views/profile'
import Msg from './views/msg'
import WebView from './views/webview'
import Sync from './views/sync'

export default (
  <Router>
    <Route path="/" component={Layout}>
      <IndexRoute component={Inbox} />
      <Route path="bookmarks" component={Bookmarks} />
      <Route path="data" component={Data} />
      <Route path="people" component={People} />
      <Route path="profile/:id" component={Profile} />
      <Route path="msg/:id" component={Msg} />
      <Route path="webview/:id" component={WebView} />
      <Route path="sync" component={Sync} />
    </Route>
  </Router>
)