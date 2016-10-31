var MutantMap = require('@mmckegg/mutant/map')
var computed = require('@mmckegg/mutant/computed')
var when = require('@mmckegg/mutant/when')
var send = require('@mmckegg/mutant/send')

var plugs = require('patchbay/plugs')
var h = require('../lib/h')
var message_compose = plugs.first(exports.message_compose = [])
var sbot_log = plugs.first(exports.sbot_log = [])
var feed_summary = plugs.first(exports.feed_summary = [])
var obs_channels = plugs.first(exports.obs_channels = [])
var obs_subscribed_channels = plugs.first(exports.obs_subscribed_channels = [])
var get_id = plugs.first(exports.get_id = [])
var publish = plugs.first(exports.sbot_publish = [])
var obs_following = plugs.first(exports.obs_following = [])
var obs_recently_updated_feeds = plugs.first(exports.obs_recently_updated_feeds = [])
var avatar_image = plugs.first(exports.avatar_image = [])
var avatar_name = plugs.first(exports.avatar_name = [])
var obs_local = plugs.first(exports.obs_local = [])

exports.screen_view = function (path, sbot) {
  if (path === '/public') {
    var id = get_id()
    var channels = computed(obs_channels(), items => items.slice(0, 6), {comparer: arrayEq})
    var subscribedChannels = obs_subscribed_channels(id)
    var loading = computed(subscribedChannels.sync, x => !x)
    var localPeers = obs_local()
    var following = obs_following(id)

    var whoToFollow = computed([obs_following(id), obs_recently_updated_feeds(200)], (following, recent) => {
      return Array.from(recent).filter(x => x !== id && !following.has(x)).slice(0, 20)
    })

    return h('SplitView', [
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
              href: `#${id}`
            }, [
              h('div.avatar', [avatar_image(id)]),
              h('div.main', [
                h('div.name', [ avatar_name(id) ])
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
              h('div.avatar', [avatar_image(id)]),
              h('div.main', [
                h('div.name', [ avatar_name(id) ])
              ])
            ])
          })
        ])
      ]),
      h('div.main', [
        feed_summary(sbot_log, [
          message_compose({type: 'post'}, {placeholder: 'Write a public message'})
        ], {
          waitUntil: computed([
            following.sync,
            subscribedChannels.sync
          ], x => x.every(Boolean)),
          filter: (item) => {
            return id === item.author || following().has(item.author) || subscribedChannels().has(item.channel)
          }
        })
      ])
    ])
  }
}

function subscribe (id) {
  publish({
    type: 'channel',
    channel: id,
    subscribed: true
  })
}

function unsubscribe (id) {
  publish({
    type: 'channel',
    channel: id,
    subscribed: false
  })
}

function arrayEq (a, b) {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length && a !== b) {
    return a.every((value, i) => value === b[i])
  }
}
