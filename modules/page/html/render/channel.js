var { h, when, send } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'channel.obs.subscribed': 'first',
  'message.html.compose': 'first',
  'feed.html.rollup': 'first',
  'feed.pull.channel': 'first',
  'sbot.pull.log': 'first',
  'message.async.publish': 'first',
  'keys.sync.id': 'first',
  'intl.sync.format': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  var format = api.intl.sync.format;
  return nest('page.html.render', function channel (path) {
    if (path[0] !== '#') return

    var channel = path.substr(1)
    var subscribedChannels = api.channel.obs.subscribed(api.keys.sync.id())

    var prepend = [
      h('div', {className: 'PageHeading'}, [
        h('h1', `#${channel}`),
        h('div.meta', [
          when(subscribedChannels.has(channel),
            h('a.ToggleButton.-unsubscribe', {
              'href': '#',
              'title': format('clickUnsubscribe'),
              'ev-click': send(unsubscribe, channel)
            }, format('subscribed')),
            h('a.ToggleButton.-subscribe', {
              'href': '#',
              'ev-click': send(subscribe, channel)
            }, format('subscribe'))
          )
        ])
      ]),
      api.message.html.compose({
        meta: {type: 'post', channel},
        placeholder: format('writeMessageChannel')
      })
    ]

    return api.feed.html.rollup(api.feed.pull.channel(channel), { prepend, windowSize: 100 })
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
