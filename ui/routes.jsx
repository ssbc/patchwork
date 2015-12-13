'use babel'
import React from 'react'
import { Router, Route, IndexRoute } from 'react-router'
import app from './lib/app'
import Layout from './layout'
import NewsFeed from './views/newsfeed'
import Inbox from './views/inbox'
import Data from './views/data'
import Msg from './views/msg'
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

// open/close channels column on navigation events
// this allows us to keep channels open on the message page if the last page was the feed ...
// ... and also to keep channels closed on the message page if the last page was anywhere else
const openChannels = () => app.emit('layout:toggleChannels', true)
const closeChannels = () => app.emit('layout:toggleChannels', false)

export default (
  <Router history={app.history}>
    <Route path="/" component={Layout}>
      <IndexRoute component={NewsFeed} onEnter={openChannels} />
      <Route path="channel/:channel" component={NewsFeed} onEnter={openChannels} />
      <Route path="inbox" component={Inbox} onEnter={closeChannels} />
      <Route path="data" component={Data} onEnter={closeChannels} />
      <Route path="profile" component={Profile} onEnter={closeChannels} />
      <Route path="profile/:id" component={Profile} onEnter={closeChannels} />
      <Route path="msg/:id" component={Msg} />
      <Route path="webview/:id" component={WebView} />
      <Route path="sync" component={Sync} onEnter={closeChannels} />
      <Route path="help/:section" component={Help} onEnter={closeChannels} />
      <Route path="search/:query" component={Search} onEnter={closeChannels} />
    </Route>
  </Router>
)