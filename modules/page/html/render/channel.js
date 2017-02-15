var { h, when, send } = require('mutant')
var pull = require('pull-stream')
var nest = require('depnest')

exports.needs = nest({
  'channel.obs.subscribed': 'first',
  'feed.html.rollup': 'first',
  'sbot.pull.log': 'first',
  'sbot.async.publish': 'first',
  'keys.sync.id': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path[0] !== '#') return

    var channel = path.substr(1)
    var subscribedChannels = api.channel.obs.subscribed(api.keys.sync.id())

    var prepend = [
      h('div', {className: 'PageHeading'}, [
        h('h1', `#${channel}`),
        h('div.meta', [
          when(subscribedChannels.has(channel),
            h('a -unsubscribe', {
              'href': '#',
              'title': 'Click to unsubscribe',
              'ev-click': send(unsubscribe, channel)
            }, 'Subscribed'),
            h('a -subscribe', {
              'href': '#',
              'ev-click': send(subscribe, channel)
            }, 'Subscribe')
          )
        ])
      ]),
      //api.message.html.compose({type: 'post', channel: channel}, {placeholder: 'Write a message in this channel\n\n\n\nPeople who follow you or subscribe to this channel will also see this message in their main feed.\n\nTo create a new channel, type the channel name (preceded by a #) into the search box above. e.g #cat-pics'})
    ]

    return api.feed.html.rollup((opts) => {
      return pull(
        api.sbot.pull.log(opts),
        pull.map(matchesChannel)
      )
    }, { prepend })

    // scoped

    function matchesChannel (msg) {
      if (msg.sync) return
      var c = msg && msg.value && msg.value.content
      if (c && c.channel === channel) {
        return msg
      } else {
        return {timestamp: msg.timestamp}
      }
    }
  })

  function subscribe (id) {
    api.sbot.async.publish({
      type: 'channel',
      channel: id,
      subscribed: true
    })
  }

  function unsubscribe (id) {
    api.sbot.async.publish({
      type: 'channel',
      channel: id,
      subscribed: false
    })
  }
}
