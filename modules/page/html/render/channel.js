var { h, when, send } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'channel.obs.subscribed': 'first',
  'message.html.compose': 'first',
  'feed.html.rollup': 'first',
  'feed.pull.channel': 'first',
  'sbot.pull.log': 'first',
  'message.async.publish': 'first',
  'keys.sync.id': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path[0] !== '#') return

    var channel = path.substr(1)
    var subscribedChannels = api.channel.obs.subscribed(api.keys.sync.id())

    var prepend = [
      h('PageHeading', [
        h('h1', `#${channel}`),
        h('div.meta', [
          when(subscribedChannels.has(channel),
            h('a.ToggleButton.-unsubscribe', {
              'href': '#',
              'title': 'Click to unsubscribe',
              'ev-click': send(unsubscribe, channel)
            }, 'Subscribed'),
            h('a.ToggleButton.-subscribe', {
              'href': '#',
              'ev-click': send(subscribe, channel)
            }, 'Subscribe')
          )
        ])
      ]),
      api.message.html.compose({
        meta: {type: 'post', channel},
        placeholder: 'Write a message in this channel\n\n\n\nPeople who follow you or subscribe to this channel will also see this message in their main feed.\n\nTo create a new channel, type the channel name (preceded by a #) into the search box above. e.g #cat-pics'
      })
    ]

    return api.feed.html.rollup(api.feed.pull.channel(channel), {
      prepend,
      displayFilter: mentionFilter,
      bumpFilter: mentionFilter
    })

    function mentionFilter (msg) {
      if (msg.value.content.channel === channel) return true
      if (Array.isArray(msg.value.content.mentions)) {
        if (msg.value.content.mentions.some(mention => {
          return mention && mention.link === `#${channel}`
        })) {
          return 'channel-mention'
        }
      }
    }
  })

  function subscribe (id) {
    // confirm
    api.message.async.publish({
      type: 'channel',
      channel: id,
      subscribed: true
    })
  }

  function unsubscribe (id) {
    // confirm
    api.message.async.publish({
      type: 'channel',
      channel: id,
      subscribed: false
    })
  }
}
