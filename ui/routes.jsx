'use babel'
import React from 'react'
import { Router, Route, IndexRoute } from 'react-router'
import app from './lib/app'
import Layout from './layout'
import NewsFeed from './views/newsfeed'
import Inbox from './views/inbox'
import Bookmarks from './views/bookmarks'
import Data from './views/data'
import Msg from './views/msg'
import Composer from './views/composer'
import Channels from './views/channels'
import Profile from './views/profile'
import WebView from './views/webview'
import Sync from './views/sync'
import Help from './views/help'
import Search from './views/search'

function beforeNavigation (nextState) {
  if (nextState.action === 'PUSH') { // only on new navs, not on back-btn-driven navs
    // capture scroll position of all vertical-filled components
    var vfScrollTops = {}
    var vfEls = Array.from(document.querySelectorAll('.vertical-filled'))
    vfEls.forEach(el => {
      if (el.id)
        vfScrollTops[el.id] = el.scrollTop
    })
    window.history.replaceState({ vfScrollTops: vfScrollTops }, '')
  }
}
app.history.listenBefore(beforeNavigation)

export default (
  <Router history={app.history}>
    <Route path="/" component={Layout}>
      <IndexRoute component={NewsFeed} />
      <Route path="newsfeed/channel/:channel" component={NewsFeed} />
      <Route path="channels" component={Channels} />
      <Route path="inbox" component={Inbox} />
      <Route path="bookmarks" component={Bookmarks} />
      <Route path="data" component={Data} />
      <Route path="profile" component={Profile} />
      <Route path="profile/:id" component={Profile} />
      <Route path="msg/:id" component={Msg} />
      <Route path="composer" component={Composer} />
      <Route path="webview/:id" component={WebView} />
      <Route path="sync" component={Sync} />
      <Route path="help/:section" component={Help} />
      <Route path="search/:query" component={Search} />
    </Route>
  </Router>
)