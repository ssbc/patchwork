'use babel'
import React from 'react'
import ssbref from 'ssb-ref'
import app from './app'
import u from 'patchkit-util'
import social from 'patchkit-util/social'
import t from 'patchwork-translations'

const MAX_CHANNEL_RESULTS = 3
const MAX_USER_RESULTS = 3

export function getResults (query) {
  var results = []

  // ssb references
  if (ssbref.isLink(query)) {
    var shortened = u.shortString(query)
    if (ssbref.isFeedId(query))      results = [{ icon: 'user',     label: t('search.OpenUser', {id: shortened}),   fn: openObject }]
    else if (ssbref.isMsgId(query))  results = [{ icon: 'envelope', label: t('search.OpenMessage', {id: shortened}), fn: openObject }]
    else if (ssbref.isBlobId(query)) results = [{ icon: 'file',     label: t('search.OpenFile', {id: shortened}),    fn: openObject }]
    results.push({ icon: 'search', label: t('search.SearchForReferences', {id: shortened}), fn: doSearch({ type: 'mentions' }) })
    return results
  }

  // general results
  results = results.concat([
    { icon: 'envelope', label: t('search.SearchMessages', {query}), fn: doSearch({ type: 'posts' }) }
  ])

  // builtin pages
  // TODO

  // known users
  results = results.concat(getUserResults(query))

  // channels
  results = results.concat(getChannelResults(query))

  return results
}

function getUserResults (query) {
  if (query.charAt(0) == '#') // strip off the pound
    query = query.slice(1)
  query = query.toLowerCase()

  var results = []
  for (let id in app.users.names) {
    var name = app.users.names[id]
    if (typeof name == 'string' && name.toLowerCase().indexOf(query) !== -1)
      results.push(id)
  }
  // sort by popularity (isnt that just the way of things?)
  results.sort(social.sortByPopularity.bind(social, app.users))
  results = results
    .slice(0, MAX_USER_RESULTS)
    .map(id => { return { icon: 'user', label: t('search.OpenUser', {id: app.users.names[id]}), fn: () => openObject(id) } })
  return results
}

function getChannelResults (query) {
  if (query.charAt(0) == '#') // strip off the pound
    query = query.slice(1)
  query = query.toLowerCase()

  var hasExact = false
  var results = []
  for (var i=0; i < app.channels.length && results.length < MAX_CHANNEL_RESULTS; i++) {
    var ch = app.channels[i]
    if (ch.name.toLowerCase().indexOf(query) !== -1) {
      if (!hasExact)
        hasExact = (ch.name == query)
      results.push({
        icon: 'hashtag',
        label: <span>{t('search.OpenChannel', {name: ch.name})}</span>,
        fn: openChannel(ch.name)
      })
    }
  }
  if (!hasExact)
    results.push({ icon: 'hashtag', label: t('search.OpenChannel', {name: query}), fn: openChannel(query) })
  return results
}

function openObject (ref) {
  if (ssbref.isFeedId(ref)) {
    app.history.pushState(null, '/profile/'+encodeURIComponent(ref))
  } else if (ssbref.isMsgId(ref)) {
    app.history.pushState(null, '/msg/'+encodeURIComponent(ref))
  } else if (ssbref.isBlobId(ref)) {
    window.location = '/'+encodeURIComponent(ref)
  }
}

const openChannel = channel => () => {
  if (channel.charAt(0) == '#') // strip off the pound
    channel = channel.slice(1)
  app.history.pushState(null, '/channel/'+encodeURIComponent(channel))
}

export const doSearch = opts => query => {
  // TODO incorporate `opts`
  app.history.pushState(null, '/search/'+encodeURIComponent(query))
}