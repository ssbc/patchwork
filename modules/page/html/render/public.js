var nest = require('depnest')
var extend = require('xtend')
var pull = require('pull-stream')
var { h, send, when, computed, map, onceTrue } = require('mutant')

exports.needs = nest({
  sbot: {
    obs: {
      connectedPeers: 'first',
      localPeers: 'first',
      connection: 'first'
    }
  },
  'sbot.pull.stream': 'first',
  'feed.pull.public': 'first',
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'invite.sheet': 'first',

  'message.html.compose': 'first',
  'message.async.publish': 'first',
  'message.sync.root': 'first',
  'progress.html.peer': 'first',

  'feed.html.followWarning': 'first',
  'feed.html.followerWarning': 'first',
  'feed.html.rollup': 'first',
  'profile.obs.recentlyUpdated': 'first',
  'profile.obs.contact': 'first',
  'contact.obs.following': 'first',
  'contact.obs.blocking': 'first',
  'channel.obs': {
    subscribed: 'first',
    recent: 'first'
  },
  'channel.sync.normalize': 'first',
  'keys.sync.id': 'first',
  'settings.obs.get': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest({
  'page.html.render': true
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', page)

  function page (path) {
    if (path !== '/public') return // "/" is a sigil for "page"

    var id = api.keys.sync.id()
    var following = api.contact.obs.following(id)
    var blocking = api.contact.obs.blocking(id)
    var subscribedChannels = api.channel.obs.subscribed(id)
    var recentChannels = api.channel.obs.recent()
    var loading = computed([subscribedChannels.sync, recentChannels.sync], (...args) => !args.every(Boolean))
    var channels = computed(recentChannels, items => items.slice(0, 8), {comparer: arrayEq})
    var connectedPeers = api.sbot.obs.connectedPeers()
    var localPeers = api.sbot.obs.localPeers()
    var connectedPubs = computed([connectedPeers, localPeers], (c, l) => c.filter(x => !l.includes(x)))
    var contact = api.profile.obs.contact(id)

    var prepend = [
      api.message.html.compose({ meta: { type: 'post' }, placeholder: i18n('Write a public message') }),
      noVisibleNewPostsWarning(),
      noFollowersWarning()
    ]

    var lastMessage = null

    var getStream = (opts) => {
      if (!opts.lt) {
        // HACK: reset the isReplacementMessage check
        lastMessage = null
      }
      if (opts.lt != null && !opts.lt.marker) {
        // if an lt has been specified that is not a marker, assume stream is finished
        return pull.empty()
      } else {
        return api.sbot.pull.stream(sbot => sbot.patchwork.roots(extend(opts, {
          ids: [id]
        })))
      }
    }

    var filters = api.settings.obs.get('filters')
    var feedView = api.feed.html.rollup(getStream, {
      prepend,
      prefiltered: true, // we've already filtered out the roots we don't want to include
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.latest({ids: [id]})),
      bumpFilter: function (msg) {
        // this needs to match the logic in sbot/roots so that we display the
        // correct bump explainations
        if (msg.value && msg.value.content && typeof msg.value.content === 'object') {
          var type = msg.value.content.type
          if (type === 'vote') return false

          var author = msg.value.author

          if (id === author || following().includes(author)) {
            return true
          } else if (matchesSubscribedChannel(msg)) {
            return 'matches-channel'
          }
        }
      },
      rootFilter: function (msg) {
        // skip messages that are directly replaced by the previous message
        // e.g. follow / unfollow in quick succession
        // THIS IS A TOTAL HACK!!! SHOULD BE REPLACED WITH A PROPER ROLLUP!
        var isOutdated = isReplacementMessage(msg, lastMessage)
        if (checkFeedFilter(msg) && !isOutdated) {
          lastMessage = msg
          return true
        }
      },
      compactFilter: function (msg, root) {
        if (!root && api.message.sync.root(msg)) {
          // msg has a root, but is being displayed as root (fork)
          return true
        }
      },
      waitFor: computed([
        following.sync,
        subscribedChannels.sync
      ], (...x) => x.every(Boolean))
    })

    // call reload whenever filters changes (equivalent to the refresh from inside rollup)
    filters(feedView.reload)

    var result = h('div.SplitView', [
      h('div.side', [
        getSidebar()
      ]),
      h('div.main', feedView)
    ])

    result.pendingUpdates = feedView.pendingUpdates
    result.reload = function () {
      feedView.reload()
    }

    return result

    function checkFeedFilter (root) {
      const filterObj = filters()
      if (filterObj) {
        const rootType = getType(root)
        if (
          (filterObj.following && rootType === 'contact') ||
          (filterObj.subscriptions && rootType === 'channel') ||
          (filterObj.onlySubscribed && rootType === 'post' && !matchesSubscribedChannel(root))
        ) {
          return false
        }
      }
      return true
    }

    function matchesSubscribedChannel (msg) {
      if (msg.filterResult) {
        return msg.filterResult.matchesChannel || msg.filterResult.matchingTags.length
      } else {
        var channel = api.channel.sync.normalize(msg.value.content.channel)
        var tagged = checkTag(msg.value.content.mentions)
        var isSubscribed = channel ? subscribedChannels().has(channel) : false
        return isSubscribed || tagged
      }
    }

    function checkTag (mentions) {
      if (Array.isArray(mentions)) {
        return mentions.some((mention) => {
          if (mention && typeof mention.link === 'string' && mention.link.startsWith('#')) {
            var channel = api.channel.sync.normalize(mention.link.slice(1))
            return channel ? subscribedChannels().has(channel) : false
          }
        })
      }
    }

    function getSidebar () {
      var whoToFollow = computed([api.profile.obs.recentlyUpdated(), following, blocking, localPeers], (recent, ...ignoreFeeds) => {
        return recent.filter(x => x !== id && !ignoreFeeds.some(f => f.includes(x))).slice(0, 10)
      })
      return [
        h('button -pub -full', {
          'ev-click': api.invite.sheet
        }, i18n('+ Join Pub')),
        when(loading, [ h('Loading') ], [
          when(computed(channels, x => x.length), h('h2', i18n('Active Channels'))),
          h('div', {
            classList: 'ChannelList',
            hidden: loading
          }, [
            map(channels, (channel) => {
              var subscribed = subscribedChannels.has(channel)
              return h('a.channel', {
                href: `#${channel}`,
                classList: [
                  when(subscribed, '-subscribed')
                ]
              }, [
                h('span.name', '#' + channel)
              ])
            }, {maxTime: 5}),
            h('a.channel -more', {href: '/channels'}, i18n('More Channels...'))
          ])
        ]),

        PeerList(localPeers, i18n('Local')),
        PeerList(connectedPubs, i18n('Connected Pubs')),

        when(computed(whoToFollow, x => x.length), h('h2', i18n('Who to follow'))),
        when(following.sync,
          h('div', {
            classList: 'ProfileList'
          }, [
            map(whoToFollow, (id) => {
              return h('a.profile', {
                href: id
              }, [
                h('div.avatar', [api.about.html.image(id)]),
                h('div.main', [
                  h('div.name', [ api.about.obs.name(id) ])
                ])
              ])
            })
          ])
        )
      ]
    }

    function PeerList (ids, title) {
      return [
        when(computed(ids, x => x.length), h('h2', title)),
        h('div', {
          classList: 'ProfileList'
        }, [
          map(ids, (id) => {
            var connected = computed([connectedPeers, id], (peers, id) => peers.includes(id))
            return h('a.profile', {
              classList: [
                when(connected, '-connected')
              ],
              href: id
            }, [
              h('div.avatar', [api.about.html.image(id)]),
              h('div.main', [
                h('div.name', [ api.about.obs.name(id) ])
              ]),
              h('div.progress', [
                api.progress.html.peer(id)
              ]),
              h('div.controls', [
                h('a.disconnect', {href: '#', 'ev-click': send(disconnect, id), title: i18n('Force Disconnect')}, ['x'])
              ])
            ])
          })
        ])
      ]
    }

    function noVisibleNewPostsWarning () {
      const explanation = i18n('You may not be able to see new content until you follow some users or pubs.')

      const shownWhen = computed([loading, contact.isNotFollowingAnybody],
           (isLoading, isNotFollowingAnybody) => !isLoading && isNotFollowingAnybody
      )

      return api.feed.html.followWarning(shownWhen, explanation)
    }

    function noFollowersWarning () {
      const explanation = i18n(
        'Nobody will be able to see your posts until you have a follower. The easiest way to get a follower is to use a pub invite as the pub will follow you back. If you have already redeemed a pub invite and you see it has not followed you back on your profile, try another pub.'
      )

      // We only show this if the user has followed someone as the first warning ('You are not following anyone')
      // should be sufficient to get the user to join a pub. However, pubs have been buggy and not followed back on occassion.
      // Additionally, someone onboarded on a local network might follow someone on the network, but not be followed back by
      // them, so we begin to show this warning if the user has followed someone, but has no followers.
      const shownWhen = computed([loading, contact.hasNoFollowers, contact.isNotFollowingAnybody],
           (isLoading, hasNoFollowers, isNotFollowingAnybody) =>
            !isLoading && (hasNoFollowers && !isNotFollowingAnybody)
      )

      return api.feed.html.followerWarning(shownWhen, explanation)
    }

    function subscribe (id) {
      api.message.async.publish({
        type: 'channel',
        channel: id,
        subscribed: true
      })
    }

    function unsubscribe (id) {
      api.message.async.publish({
        type: 'channel',
        channel: id,
        subscribed: false
      })
    }

    function disconnect (id) {
      onceTrue(api.sbot.obs.connection, (sbot) => {
        sbot.patchwork.disconnect(id)
      })
    }
  }
}

function getType (msg) {
  return msg && msg.value && msg.value.content && msg.value.content.type
}

function arrayEq (a, b) {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a !== b) {
    return a.every((value, i) => value === b[i])
  }
}

function isReplacementMessage (msgA, msgB) {
  if (msgA && msgB && msgA.value.content && msgB.value.content && msgA.value.content.type === msgB.value.content.type) {
    if (msgA.key === msgB.key) return false
    var type = msgA.value.content.type
    if (type === 'contact') {
      return msgA.value.author === msgB.value.author && msgA.value.content.contact === msgB.value.content.contact
    }
  }
}
