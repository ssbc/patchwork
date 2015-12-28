'use babel'
import ssbref from 'ssb-ref'
import app from './app'
import u from './util'

export function getResults (query) {
  var results = []

  // ssb references
  if (ssbref.isLink(query)) {
    var shortened = u.shortString(query)
    if (ssbref.isFeedId(query))      results = [{ icon: 'user',     label: `Open user "${shortened}"`,    fn: lookupSsbRef }]
    else if (ssbref.isMsgId(query))  results = [{ icon: 'envelope', label: `Open message "${shortened}"`, fn: lookupSsbRef }]
    else if (ssbref.isBlobId(query)) results = [{ icon: 'file',     label: `Open file "${shortened}"`,    fn: lookupSsbRef }]
    results.push({ icon: 'search', label: `Search for references to "${shortened}"`, fn: doSearch({ type: 'mentions' }) })
    return results
  }

  // builtin pages
  // TODO

  // channels
  // TODO

  // known users
  // TODO

  // general results
  results = results.concat([
    { icon: 'envelope', label: `Search messages for "${query}"`, fn: doSearch({ type: 'posts' }) },
    { icon: 'user', label: `Search people for "${query}"`, fn: doSearch({ type: 'users' }) }
  ])
  return results
}

function lookupSsbRef (ref) {
  if (ssbref.isFeedId(ref)) {
    app.history.pushState(null, '/profile/'+encodeURIComponent(ref))
  } else if (ssbref.isMsgId(ref)) {
    app.history.pushState(null, '/msg/'+encodeURIComponent(ref))
  } else if (ssbref.isBlobId(ref)) {
    app.history.pushState(null, '/webview/'+encodeURIComponent(ref))            
  }
}

const doSearch = opts => query => {
  // TODO incorporate `opts`
  app.history.pushState(null, '/search/'+encodeURIComponent(query))
}