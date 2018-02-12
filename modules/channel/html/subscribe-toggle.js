var nest = require('depnest')
var { h, when, send } = require('mutant')

exports.gives = nest('channel.html.subscribeToggle')
exports.needs = nest({
  'intl.sync.i18n': 'first',
  'keys.sync.id': 'first',
  'message.async.publish': 'first',
  'channel.obs.subscribed': 'first'
})

exports.create = function (api) {
  var i18n = api.intl.sync.i18n
  return nest('channel.html.subscribeToggle', function (channel, opts) {
    var yourId = api.keys.sync.id()
    var subscribedChannels = api.channel.obs.subscribed(yourId)

    return when(subscribedChannels.has(channel),
      h('a.ToggleButton.-unsubscribe', {
        'href': '#',
        'title': i18n('Click to unsubscribe'),
        'ev-click': send(unsubscribe, channel)
      }, i18n('Subscribed')),
      h('a.ToggleButton.-subscribe', {
        'href': '#',
        'ev-click': send(subscribe, channel)
      }, i18n('Subscribe'))
    )
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
