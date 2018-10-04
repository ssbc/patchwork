var nest = require('depnest')
var {Value, Proxy, Array: MutantArray, h, computed, when, throttle} = require('mutant')
var pull = require('pull-stream')
var Abortable = require('pull-abortable')
var Scroller = require('../../../lib/scroller')
var extend = require('xtend')
var GroupSummaries = require('../../../lib/group-summaries')
var rootBumpTypes = ['mention', 'channel-mention']
var getBump = require('../../../lib/get-bump')

var bumpMessages = {
  'reaction': 'liked this message',
  'reply': 'replied to this message',
  'updated': 'added changes',
  'mention': 'mentioned you',
  'channel-mention': 'mentioned this channel',
  'attending': 'can attend'
}

exports.needs = nest({
  'app.sync.externalHandler': 'first',
  'message.html.canRender': 'first',
  'message.html.render': 'first',
  'message.sync.isBlocked': 'first',
  'message.sync.unbox': 'first',
  'message.sync.timestamp': 'first',
  'profile.html.person': 'first',
  'channel.html.link': 'first',
  'message.html.link': 'first',
  'message.sync.root': 'first',
  'sbot.async.get': 'first',
  'keys.sync.id': 'first',
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'message.html.missing': 'first',
  'feed.html.metaSummary': 'first'
})

exports.gives = nest({
  'feed.html.rollup': true
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const i18nPlural = api.intl.sync.i18n_n
  return nest('feed.html.rollup', function (getStream, {
    prepend,
    compactFilter = returnFalse,
    filterRepliesIfBlockedByRootAuthor = true,
    displayFilter = returnTrue,
    ungroupFilter = returnFalse,
    updateStream
  }) {
    var updates = Value(0)
    var yourId = api.keys.sync.id()
    var throttledUpdates = throttle(updates, 200)
    var updateLoader = h('a Notifier -loader', { href: '#', 'ev-click': refresh }, [
      'Show ', h('strong', [throttledUpdates]), ' ', plural(throttledUpdates, i18n('update'), i18n('updates'))
    ])

    var abortLastFeed = null
    var content = Value()
    var loading = Proxy(true)
    var unreadIds = new Set()
    var newSinceRefresh = new Set()
    var highlightItems = new Set()

    var container = h('Scroller', {
      // only bind elements that are visible in scroller
      intersectionBindingViewport: {rootMargin: '1000px'},

      style: { overflow: 'auto' },
      hooks: [(element) => {
        // don't activate until added to DOM
        refresh()

        // deactivate when removed from DOM
        return () => {
          if (abortLastFeed) {
            abortLastFeed()
            abortLastFeed = null
          }
        }
      }]
    }, [
      h('div.wrapper', [
        h('section.prepend', prepend),
        content,
        when(loading, h('Loading -large'))
      ])
    ])

    if (updateStream) {
      pull(
        updateStream,
        pull.drain((msg) => {
          if (!(msg && msg.value && msg.value.content && msg.value.content.type)) return
          // Only increment the 'new since' for items that we render on
          // the feed as otherwise the 'show <n> updates message' will be
          // shown on new messages that patchwork cannot render
          if (canRenderMessage(msg) && msg.value.author !== yourId && (!msg.root || canRenderMessage(msg.root))) {
            newSinceRefresh.add(msg.key)
            unreadIds.add(msg.key)
          }

          if (msg.value.author === yourId && content()) {
            // dynamically insert this post into the feed! (manually so that it doesn't get slow with mutant)
            if (api.message.sync.root(msg)) {
              var existingContainer = content().querySelector(`[data-root-id="${api.message.sync.root(msg)}"]`)
              if (existingContainer) {
                var replies = existingContainer.querySelector('div.replies')
                var lastReply = existingContainer.querySelector('div.replies > .Message:last-child')
                var previousId = lastReply ? lastReply.getAttribute('data-id') : existingContainer.getAttribute('data-root-id')
                replies.appendChild(api.message.html.render(msg, {
                  previousId,
                  compact: false,
                  priority: 2
                }))
              }
            } else {
              highlightItems.add(msg.key)
              content().prepend(
                renderItem(extend(msg, {
                  replies: []
                }))
              )
            }
          }

          updates.set(newSinceRefresh.size)
        })
      )
    }

    var result = MutantArray([
      when(updates, updateLoader),
      container
    ])

    result.pendingUpdates = throttledUpdates
    result.reload = refresh

    return result

    function canRenderMessage (msg) {
      if (msg && msg.value && msg.value.content) {
        return api.message.html.canRender(msg)
      }
    }

    function refresh () {
      if (abortLastFeed) abortLastFeed()
      updates.set(0)
      content.set(h('section.content'))

      var abortable = Abortable()
      abortLastFeed = abortable.abort

      highlightItems = newSinceRefresh
      newSinceRefresh = new Set()

      var firstItemVisible = Value(false)

      var done = Value(false)
      var scroller = Scroller(container, content(), renderItem, {
        onDone: () => done.set(true),
        onItemVisible: (item) => {
          if (!firstItemVisible()) {
            firstItemVisible.set(true)
          }
          if (Array.isArray(item.msgIds)) {
            item.msgIds.forEach(id => {
              unreadIds.delete(id)
            })
          }
        }
      })

      // track loading state
      loading.set(computed([done, scroller.queue, firstItemVisible], (done, queue, firstItemVisible) => {
        return !done && (queue < 5 || !firstItemVisible)
      }))

      var seen = new Set()

      pull(
        getStream(),
        abortable,
        pull.filter(item => {
          // don't show the same threads again (repeats due to pull-resume)
          if (!seen.has(item.key)) {
            seen.add(item.key)
            return true
          }
        }),
        pull.filter(canRenderMessage),

        // group related items (follows, subscribes, abouts)
        GroupSummaries({windowSize: 15, getPriority, ungroupFilter}),

        scroller
      )
    }

    function renderItem (item, opts) {
      if (item.group) {
        return api.feed.html.metaSummary(item, renderItem, getPriority, opts)
      }

      let mostRecentBumpType = (item.bumps && item.bumps[0] && item.bumps[0].type)

      let rootBump = getBump(item, item.rootBump)
      if (!mostRecentBumpType) {
        if (rootBump && rootBumpTypes.includes(rootBump.type)) {
          mostRecentBumpType = rootBump.type
        } else {
          mostRecentBumpType = 'reply'
        }
      }

      let bumps = getBumps(item)[mostRecentBumpType]

      var renderedMessage = api.message.html.render(item, {
        compact: compactFilter(item),
        priority: getPriority(item)
      })

      unreadIds.delete(item.key)

      var meta = null
      var previousId = item.key

      // explain why this message is in your feed
      if (mostRecentBumpType !== 'matches-channel' && item.rootBump && item.rootBump.type === 'matches-channel') {
        // the root post was in a channel that you subscribe to
        meta = h('div.meta', [
          many(item.rootBump.channels, api.channel.html.link, i18n), ' ', i18n('mentioned in your network')
        ])
      } else if (bumps && bumps.length) {
        let authors = getAuthors(bumps)
        if (mostRecentBumpType === 'matches-channel') {
          // a reply to this post matches a channel you subscribe to
          let channels = new Set()
          bumps.forEach(bump => bump.channels && bump.channels.forEach(c => channels.add(c)))
          meta = h('div.meta', [
            i18nPlural('%s people from your network replied to this message on ', authors.length),
            many(channels, api.channel.html.link, i18n)
          ])
        } else {
          // someone you follow replied to this message
          var description = i18n(bumpMessages[mostRecentBumpType] || 'added changes')
          meta = h('div.meta', [
            many(authors, api.profile.html.person, i18n), ' ', description
          ])
        }
      }

      return h('FeedEvent -post', [
        meta,
        renderedMessage,
        item.totalReplies > item.latestReplies.length ? h('a.full', {href: item.key}, ['View full thread' + ' (', item.totalReplies, ')']) : null,
        h('div.replies', [
          item.latestReplies.map(msg => {
            var result = api.message.html.render(msg, {
              previousId,
              compact: compactFilter(msg, item),
              priority: getPriority(msg)
            })
            previousId = msg.key

            return [
              // insert missing message marker (if can't be found)
              api.message.html.missing(last(msg.value.content.branch), msg, item),
              result
            ]
          })
        ])
      ])
    }

    function getPriority (msg) {
      if (highlightItems.has(msg.key)) {
        return 2
      } else if (unreadIds.has(msg.key)) {
        return 1
      } else {
        return 0
      }
    }
  })
}

function plural (value, single, many) {
  return computed(value, (value) => {
    if (value === 1) {
      return single
    } else {
      return many
    }
  })
}

function many (ids, fn, intl) {
  ids = Array.from(ids)
  var featuredIds = ids.slice(0, 4)

  if (ids.length) {
    if (ids.length > 4) {
      return [
        fn(featuredIds[0]), ', ',
        fn(featuredIds[1]), ', ',
        fn(featuredIds[2]), intl(' and '),
        ids.length - 3, intl(' others')
      ]
    } else if (ids.length === 4) {
      return [
        fn(featuredIds[0]), ', ',
        fn(featuredIds[1]), ', ',
        fn(featuredIds[2]), intl(' and '),
        fn(featuredIds[3])
      ]
    } else if (ids.length === 3) {
      return [
        fn(featuredIds[0]), ', ',
        fn(featuredIds[1]), intl(' and '),
        fn(featuredIds[2])
      ]
    } else if (ids.length === 2) {
      return [
        fn(featuredIds[0]), intl(' and '),
        fn(featuredIds[1])
      ]
    } else {
      return fn(featuredIds[0])
    }
  }
}

function getAuthors (items) {
  var authors = {}
  items.forEach(item => {
    authors[item.author] = true
  })
  return Object.keys(authors)
}

function returnTrue () {
  return true
}

function returnFalse () {
  return false
}

function last (array) {
  if (Array.isArray(array)) {
    return array[array.length - 1]
  } else {
    return array
  }
}

function getBumps (msg) {
  var bumps = {}
  let rootBump = getBump(msg, msg.rootBump)

  if (rootBump) {
    bumps[rootBump.type] = [rootBump]
  }

  if (Array.isArray(msg.bumps)) {
    msg.bumps.forEach(bump => {
      let type = bump.type || 'reply'
      bumps[type] = bumps[type] || []
      bumps[type].push(bump)
    })
  }
  return bumps
}
