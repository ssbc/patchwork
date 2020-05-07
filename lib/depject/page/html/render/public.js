const nest = require('depnest')
const { h, send, when, computed, map, onceTrue, throttle } = require('mutant')

const slow = (input) => throttle(input, 1000)

exports.needs = nest({
  sbot: {
    obs: {
      connectedPeers: 'first',
      localPeers: 'first',
      stagedPeers: 'first',
      connection: 'first'
    }
  },
  'sbot.async.connConnect': 'first',
  'sbot.pull.stream': 'first',
  'sbot.pull.resumeStream': 'first',
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
  'contact.obs.followers': 'first',
  'contact.obs.blocking': 'first',
  'contact.async.follow': 'first',
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

    const id = api.keys.sync.id()
    const following = api.contact.obs.following(id)
    const blocking = api.contact.obs.blocking(id)
    const subscribedChannels = api.channel.obs.subscribed(id)
    const recentChannels = api.channel.obs.recent(8)
    const channelsLoading = computed([subscribedChannels.sync, recentChannels.sync], (...args) => !args.every(Boolean))
    const connectedPeers = api.sbot.obs.connectedPeers()
    const stagedPeers = api.sbot.obs.stagedPeers()
    const localPeers = api.sbot.obs.localPeers()
    const localPeersKeys = map(api.sbot.obs.localPeers(), peer => peer.data.key)
    const connectedPubs = computed([connectedPeers, localPeersKeys], (c, l) => c.filter(x => !l.includes(x.data.key)))
    const contact = api.profile.obs.contact(id)

    const prepend = [
      api.message.html.compose({ meta: { type: 'post' }, draftKey: 'public', placeholder: i18n('Write a public message') }),
      noVisibleNewPostsWarning(),
      noFollowersWarning()
    ]

    const getStream = api.sbot.pull.resumeStream((sbot, opts) => {
      return sbot.patchwork.publicFeed.roots(opts)
    }, { limit: 40, reverse: true })

    const filters = api.settings.obs.get('filters')
    const feedView = api.feed.html.rollup(getStream, {
      prepend,
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.publicFeed.latest()),
      compactFilter: function (msg, root) {
        if (!root && api.message.sync.root(msg)) {
          // msg has a root, but is being displayed as root (fork)
          return true
        }
      }
    })

    // call reload whenever filters changes (equivalent to the refresh from inside rollup)
    filters(feedView.reload)

    const result = h('div.SplitView', [
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

    function getSidebar () {
      const whoToFollow = computed([api.profile.obs.recentlyUpdated(), following, blocking, localPeersKeys], (recent, ...ignoreFeeds) => {
        return recent.filter(x => x !== id && !ignoreFeeds.some(f => f.includes(x))).slice(0, 10)
      })
      return [
        h('button -pub -full', {
          'ev-click': api.invite.sheet
        }, i18n('+ Join Server')),

        when(channelsLoading, [h('Loading')], [
          when(computed(recentChannels, x => x.length), [
            h('h2', i18n('Active Channels')),
            h('div', {
              classList: 'ChannelList',
              hidden: channelsLoading
            }, [
              map(recentChannels, (channel) => {
                const subscribed = subscribedChannels.has(channel)
                return h('a.channel', {
                  href: `#${channel}`,
                  classList: [
                    when(subscribed, '-subscribed')
                  ]
                }, [
                  h('span.name', '#' + channel)
                ])
              }, { maxTime: 5 }),
              h('a.channel -more', { href: '/channels' }, i18n('More Channels...'))
            ])
          ])
        ]),

        PeerList(localPeers, i18n('Local')),
        SuggestedPeerList(stagedPeers, i18n('Possible connections')),
        PeerList(connectedPubs, i18n('Connections')),

        when(computed(whoToFollow, x => x.length), h('h2', i18n('Who to follow'))),
        when(following.sync,
          h('div', {
            classList: 'ProfileList'
          }, [
            map(slow(whoToFollow), (id) => {
              return h('a.profile', {
                href: id
              }, [
                h('div.avatar', [api.about.html.image(id)]),
                h('div.main', [
                  h('div.name', [api.about.obs.name(id)])
                ])
              ])
            })
          ])
        )
      ]
    }

    function PeerList (peers, title) {
      return [
        when(computed(peers, arr => arr.length), h('h2', title)),
        h('div', {
          classList: 'ProfileList'
        }, [
          map(slow(peers), peer => {
            const address = peer.address
            const connected = peer.data.state === 'connected'
            const id = peer.data.key
            return h('a.profile', {
              classList: [
                when(connected, '-connected')
              ],
              href: id
            }, [
              h('div.avatar', [api.about.html.image(id)]),
              h('div.main', [
                h('div.name', [api.about.obs.name(id)])
              ]),
              h('div.progress', [
                api.progress.html.peer(id)
              ]),
              h('div.controls', [
                h('a.disconnect', { href: '#', 'ev-click': send(disconnect, address), title: i18n('Force Disconnect') }, ['x'])
              ])
            ])
          })
        ])
      ]
    }

    function SuggestedPeerList (peers, title) {
      return [
        when(computed(peers, arr => arr.length), h('h2', title)),
        h('div', {
          classList: 'ProfileList'
        }, [
          map(slow(peers), peer => {
            const id = peer.data.key
            return h('a.profile', { href: id }, [
              h('div.main', [
                h('div.name', [api.about.obs.name(id)])
              ]),
              h('div.controls', [
                h('a.connect', { href: '#', 'ev-click': send(connect, peer), title: i18n('Connect') }, [i18n('Connect')])
              ])
            ])
          })
        ])
      ]
    }

    function noVisibleNewPostsWarning () {
      const explanation = i18n('You may not be able to see new content until you follow some users or pubs.')

      const shownWhen = computed([contact.sync, contact.isNotFollowingAnybody],
        (contactSync, isNotFollowingAnybody) => contactSync && isNotFollowingAnybody
      )

      return api.feed.html.followWarning(shownWhen, explanation)
    }

    function noFollowersWarning () {
      const explanation = i18n(
        'Nobody will be able to see your posts until you have a follower. The easiest way to get a follower is to use a pub invite as the pub will follow you back. If you have already redeemed a pub invite and you see it has not followed you back on your profile, try another pub.'
      )

      // We only show this if the user has followed someone as the first warning ('You are not following anyone')
      // should be sufficient to get the user to join a pub. However, pubs have been buggy and not followed back on occasion.
      // Additionally, someone on-boarded on a local network might follow someone on the network, but not be followed back by
      // them, so we begin to show this warning if the user has followed someone, but has no followers.
      const shownWhen = computed([contact.sync, contact.hasNoFollowers, contact.isNotFollowingAnybody],
        (contactSync, hasNoFollowers, isNotFollowingAnybody) =>
          contactSync && (hasNoFollowers && !isNotFollowingAnybody)
      )

      return api.feed.html.followerWarning(shownWhen, explanation)
    }

    function connect (peer) {
      api.sbot.async.connConnect(peer.address, peer.data, () => {})
    }

    function disconnect (addr) {
      onceTrue(api.sbot.obs.connection, sbot => {
        sbot.patchwork.disconnect(addr)
      })
    }
  }
}
