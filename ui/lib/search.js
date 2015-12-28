'use babel'
import React from 'react'
import ssbref from 'ssb-ref'
import app from './app'
import u from './util'

export function getResults (query) {
  var results = []

  // ssb references
  if (ssbref.isLink(query)) {
    var shortened = u.shortString(query)
    if (ssbref.isFeedId(query))      results = [{ icon: 'user',     label: `Open user "${shortened}"`,    fn: openObject }]
    else if (ssbref.isMsgId(query))  results = [{ icon: 'envelope', label: `Open message "${shortened}"`, fn: openObject }]
    else if (ssbref.isBlobId(query)) results = [{ icon: 'file',     label: `Open file "${shortened}"`,    fn: openObject }]
    results.push({ icon: 'search', label: `Search for references to "${shortened}"`, fn: doSearch({ type: 'mentions' }) })
    return results
  }

  // builtin pages
  // TODO

  // channels
  if (query.charAt(0) == '#')
    results = results.concat(searchChannels(query))

  // known users
  // TODO

  // general results
  results = results.concat([
    { icon: 'envelope', label: `Search messages for "${query}"`, fn: doSearch({ type: 'posts' }) },
    { icon: 'user', label: `Search people for "${query}"`, fn: doSearch({ type: 'users' }) }
  ])
  return results
}

function searchChannels (query) {
  if (query.charAt(0) == '#') // strip off the pound
    query = query.slice(1)
  query = query.toLowerCase()

  var hasExact = false
  var results = app.channels
    .filter(ch => ch.name.toLowerCase().indexOf(query) !== -1)
    .map(ch => {
      if (!hasExact)
        hasExact = ch.name == query
      return {
        icon: 'hashtag',
        label: <span>Open channel #{ch.name}</span>,
        fn: openChannel(ch.name)
      }
    })
  if (!hasExact)
    results.push({ icon: 'hashtag', label: `Open channel #${query}`, fn: openChannel(query) })
  return results
}

function openObject (ref) {
  if (ssbref.isFeedId(ref)) {
    app.history.pushState(null, '/profile/'+encodeURIComponent(ref))
  } else if (ssbref.isMsgId(ref)) {
    app.history.pushState(null, '/msg/'+encodeURIComponent(ref))
  } else if (ssbref.isBlobId(ref)) {
    app.history.pushState(null, '/webview/'+encodeURIComponent(ref))            
  }
}

const openChannel = channel => () => {
  if (channel.charAt(0) == '#') // strip off the pound
    channel = channel.slice(1)
  app.history.pushState(null, '/newsfeed/channel/'+encodeURIComponent(channel))
}

const doSearch = opts => query => {
  // TODO incorporate `opts`
  app.history.pushState(null, '/search/'+encodeURIComponent(query))
}