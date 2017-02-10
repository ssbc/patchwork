var MutantMap = require('mutant/map')
var computed = require('mutant/computed')
var when = require('mutant/when')
var send = require('mutant/send')
var pull = require('pull-stream')
var extend = require('xtend')
var h = require('../../lib/h')

exports.needs = {
  message: {
    render: 'first',
    compose: 'first',
    publish: 'first'
  },
  sbot: {
    get_id: 'first',
    log: 'first',
    feed: 'first',
    user_feed: 'first'
  },
  cache: {
    obs_channels: 'first'
  },
  helpers: {
    build_scroller: 'first'
  },
  about: {
    image: 'first',
    name: 'first'
  },
  feed_summary: 'first',
  obs_subscribed_channels: 'first',
  obs_following: 'first',
  obs_recently_updated_feeds: 'first',
  obs_local: 'first',
  obs_connected: 'first'
}

exports.gives = {
  page: true
}

exports.create = function (api) {
  return {

    page (path) {
      if (path !== '/public') return
      var id = api.sbot.get_id()
      var channels = computed(api.cache.obs_channels, items => items.slice(0, 8), {comparer: arrayEq})
      var subscribedChannels = api.obs_subscribed_channels(id)
      var loading = computed(subscribedChannels.sync, x => !x)
      var connectedPeers = api.obs_connected()
      var localPeers = api.obs_local()
      var connectedPubs = computed([connectedPeers, localPeers], (c, l) => c.filter(x => !l.includes(x)))
      var following = api.obs_following(id)

      var oldest = Date.now() - (2 * 24 * 60 * 60e3)
      getFirstMessage(id, (_, msg) => {
        if (msg) {
          // fall back to timestamp stream before this, give 48 hrs for feeds to stabilize
          if (msg.value.timestamp > oldest) {
            oldest = Date.now()
          }
        }
      })

      var whoToFollow = computed([api.obs_following(id), api.obs_recently_updated_feeds(200)], (following, recent) => {
        return Array.from(recent).filter(x => x !== id && !following.has(x)).slice(0, 10)
      })

      var feedSummary = api.feed_summary(getFeed, [
        api.message.compose({type: 'post'}, {placeholder: 'Write a public message'})
      ], {
        waitUntil: computed([
          following.sync,
          subscribedChannels.sync
        ], x => x.every(Boolean)),
        windowSize: 500,
        filter: (item) => {
          return (
            id === item.author ||
            following().has(item.author) ||
            subscribedChannels().has(item.channel) ||
            (item.repliesFrom && item.repliesFrom.has(id)) ||
            item.digs && item.digs.has(id)
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

      var result = h('SplitView', [
        h('div.side', [
          h('h2', 'Active Channels'),
          when(loading, [ h('Loading') ]),
          h('ChannelList', {
            hidden: loading
          }, [
            MutantMap(channels, (channel) => {
              var subscribed = subscribedChannels.has(channel.id)
              return h('a.channel', {
                href: `##${channel.id}`,
                classList: [
                  when(subscribed, '-subscribed')
                ]
              }, [
                h('span.name', '#' + channel.id),
                when(subscribed,
                  h('a -unsubscribe', {
                    'ev-click': send(unsubscribe, channel.id)
                  }, 'Unsubscribe'),
                  h('a -subscribe', {
                    'ev-click': send(subscribe, channel.id)
                  }, 'Subscribe')
                )
              ])
            }, {maxTime: 5})
          ]),

          when(computed(localPeers, x => x.length), h('h2', 'Local')),
          h('ProfileList', [
            MutantMap(localPeers, (id) => {
              return h('a.profile', {
                classList: [
                  when(computed([connectedPeers, id], (p, id) => p.includes(id)), '-connected')
                ],
                href: `#${id}`
              }, [
                h('div.avatar', [api.about.image(id)]),
                h('div.main', [
                  h('div.name', [ api.about.name(id) ])
                ])
              ])
            })
          ]),

          when(computed(whoToFollow, x => x.length), h('h2', 'Who to follow')),
          h('ProfileList', [
            MutantMap(whoToFollow, (id) => {
              return h('a.profile', {
                href: `#${id}`
              }, [
                h('div.avatar', [api.about.image(id)]),
                h('div.main', [
                  h('div.name', [ api.about.name(id) ])
                ])
              ])
            })
          ]),

          when(computed(connectedPubs, x => x.length), h('h2', 'Connected Pubs')),
          h('ProfileList', [
            MutantMap(connectedPubs, (id) => {
              return h('a.profile', {
                classList: [ '-connected' ],
                href: `#${id}`
              }, [
                h('div.avatar', [api.about.image(id)]),
                h('div.main', [
                  h('div.name', [ api.about.name(id) ])
                ])
              ])
            })
          ])
        ]),
        h('div.main', [ feedSummary ])
      ])

      result.pendingUpdates = feedSummary.pendingUpdates
      result.reload = feedSummary.reload

      return result

      // scoped

      function getFeed (opts) {
        if (opts.lt && opts.lt < oldest) {
          opts = extend(opts, {lt: parseInt(opts.lt, 10)})
          return pull(
            api.sbot.feed(opts),
            pull.map((msg) => {
              if (msg.sync) {
                return msg
              } else {
                return {key: msg.key, value: msg.value, timestamp: msg.value.timestamp}
              }
            })
          )
        } else {
          return api.sbot.log(opts)
        }
      }
    }
  }

  // scoped

  function subscribe (id) {
    api.message.publish({
      type: 'channel',
      channel: id,
      subscribed: true
    })
  }

  function unsubscribe (id) {
    api.message.publish({
      type: 'channel',
      channel: id,
      subscribed: false
    })
  }

  function getFirstMessage (feedId, cb) {
    api.sbot.user_feed({id: feedId, gte: 0, limit: 1})(null, cb)
  }
}

function fromDay (msg, fromTime) {
  return (fromTime - msg.timestamp) < (24 * 60 * 60e3)
}

function isMentioned (id, list) {
  if (Array.isArray(list)) {
    return list.includes(id)
  } else {
    return false
  }
}

function arrayEq (a, b) {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a !== b) {
    return a.every((value, i) => value === b[i])
  }
}
