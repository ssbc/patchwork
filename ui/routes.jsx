'use babel'
import { Router, Route, IndexRoute } from 'react-router'
import Layout from './layout'
import NewsFeed from './views/newsfeed'
import Inbox from './views/inbox'
import Bookmarks from './views/bookmarks'
import Data from './views/data'
import Profile from './views/profile'
import Msg from './views/msg'
import WebView from './views/webview'
import Sync from './views/sync'

export default (
  <Router>
    <Route path="/" component={Layout}>
      <IndexRoute component={NewsFeed} />
      <Route path="inbox" component={Inbox} />
      <Route path="bookmarks" component={Bookmarks} />
      <Route path="data" component={Data} />
      <Route path="profile" component={Profile} />
      <Route path="profile/:id" component={Profile} />
      <Route path="msg/:id" component={Msg} />
      <Route path="webview/:id" component={WebView} />
      <Route path="sync" component={Sync} />
    </Route>
  </Router>
)