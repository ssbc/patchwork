var nest = require('depnest')
var { h, send, when, computed, map } = require('mutant')
var extend = require('xtend')
var pull = require('pull-stream')

exports.needs = nest({
  sbot: {
    pull: {
      log: 'first',
      feed: 'first',
      userFeed: 'first'
    },
    obs: {
      connectedPeers: 'first',
      localPeers: 'first'
    }
  },
  'about.html.image': 'first',
  'about.obs.name': 'first',
  'invite.sheet': 'first',

  'message.html.compose': 'first',
  'message.async.publish': 'first',
  'progress.html.peer': 'first',

  'feed.html.rollup': 'first',
  'profile.obs.recentlyUpdated': 'first',
  'contact.obs.following': 'first',
  'channel.obs': {
    subscribed: 'first',
    recent: 'first'
  },
  'keys.sync.id': 'first'
})

exports.gives = nest({
  'page.html.render': true
})

exports.create = function (api) {
  return nest('page.html.render', page)

  function page (path) {
    if (path !== '/public') return // "/" is a sigil for "page"

    var id = api.keys.sync.id()
    var following = api.contact.obs.following(id)
    var subscribedChannels = api.channel.obs.subscribed(id)
    var loading = computed(subscribedChannels.sync, x => !x)
    var channels = computed(api.channel.obs.recent(), items => items.slice(0, 8), {comparer: arrayEq})
    var connectedPeers = api.sbot.obs.connectedPeers()
    var localPeers = api.sbot.obs.localPeers()
    var connectedPubs = computed([connectedPeers, localPeers], (c, l) => c.filter(x => !l.includes(x)))

    var oldest = Date.now() - (2 * 24 * 60 * 60e3)
    getFirstMessage(id, (_, msg) => {
      if (msg) {
        // fall back to timestamp stream before this, give 48 hrs for feeds to stabilize
        if (msg.value.timestamp > oldest) {
          oldest = Date.now()
        }
      }
    })

    var prepend = [
      api.message.html.compose({ meta: { type: 'post' }, placeholder: 'Write a public message' })
    ]

    var feedView = api.feed.html.rollup(getFeed, {
      prepend,
      waitUntil: computed([
        following.sync,
        subscribedChannels.sync
      ], (...x) => x.every(Boolean)),
      windowSize: 500,
      filter: (item) => {
        return !item.boxed && (
          id === item.author ||
          following().has(item.author) ||
          subscribedChannels().has(item.channel) ||
          (item.repliesFrom && item.repliesFrom.has(id)) ||
          item.likes && item.likes.has(id)
        )
      },
      bumpFilter: (msg, group) => {
        if (!group.message) {
          return (
            isMentioned(id, msg.value.content.mentions) ||
            msg.value.author === id || (
              fromDay(msg, group.fromTime) && (
                following().has(msg.value.author) ||
                group.repliesFrom.has(id)
              )
            )
          )
        }
        return true
      }
    })

    var result = h('div.SplitView', [
      h('div.side', [
        getSidebar()
      ]),
      h('div.main', feedView)
    ])

    result.pendingUpdates = feedView.pendingUpdates
    result.reload = feedView.reload

    return result

    function getSidebar () {
      var whoToFollow = computed([following, api.profile.obs.recentlyUpdated(200), localPeers], (following, recent, peers) => {
        return Array.from(recent).filter(x => x !== id && !following.has(x) && !peers.includes(x)).slice(0, 10)
      })
      return [
        h('button -pub -full', {
          'ev-click': api.invite.sheet
        }, '+ Join Pub'),
        when(computed(channels, x => x.length), h('h2', 'Active Channels')),
        when(loading, [ h('Loading') ]),
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
              h('span.name', '#' + channel),
              when(subscribed,
                h('a.-unsubscribe', {
                  'ev-click': send(unsubscribe, channel)
                }, 'Unsubscribe'),
                h('a.-subscribe', {
                  'ev-click': send(subscribe, channel)
                }, 'Subscribe')
              )
            ])
          }, {maxTime: 5})
        ]),

        PeerList(localPeers, 'Local'),
        PeerList(connectedPubs, 'Connected Pubs'),

        when(computed(whoToFollow, x => x.length), h('h2', 'Who to follow')),
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
                  h('div.name', [ '@', api.about.obs.name(id) ])
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
            return h('a.profile', {
              classList: [ '-connected' ],
              href: id
            }, [
              h('div.avatar', [api.about.html.image(id)]),
              h('div.main', [
                h('div.name', [ api.about.obs.name(id) ])
              ]),
              h('div.progress', [
                api.progress.html.peer(id)
              ])
            ])
          })
        ])
      ]
    }

    function getFeed (opts) {
      if (opts.lt && opts.lt < oldest) {
        opts = extend(opts, {lt: parseInt(opts.lt, 10)})
        return pull(
          api.sbot.pull.feed(opts),
          pull.map((msg) => {
            if (msg.sync) {
              return msg
            } else {
              return {key: msg.key, value: msg.value, timestamp: msg.value.timestamp}
            }
          })
        )
      } else {
        return api.sbot.pull.log(opts)
      }
    }

    function getFirstMessage (feedId, cb) {
      api.sbot.pull.userFeed({id: feedId, gte: 0, limit: 1})(null, cb)
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
  }
}

function isMentioned (id, list) {
  if (Array.isArray(list)) {
    return list.includes(id)
  } else {
    return false
  }
}

function fromDay (msg, fromTime) {
  return (fromTime - msg.timestamp) < (24 * 60 * 60e3)
}

function arrayEq (a, b) {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a !== b) {
    return a.every((value, i) => value === b[i])
  }
}
