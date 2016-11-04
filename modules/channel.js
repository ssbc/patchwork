var when = require('@mmckegg/mutant/when')
var send = require('@mmckegg/mutant/send')
var plugs = require('patchbay/plugs')
var message_compose = plugs.first(exports.message_compose = [])
var sbot_log = plugs.first(exports.sbot_log = [])
var feed_summary = plugs.first(exports.feed_summary = [])
var h = require('../lib/h')
var pull = require('pull-stream')
var obs_subscribed_channels = plugs.first(exports.obs_subscribed_channels = [])
var get_id = plugs.first(exports.get_id = [])
var publish = plugs.first(exports.sbot_publish = [])

exports.screen_view = function (path, sbot) {
  if (path[0] === '#') {
    var channel = path.substr(1)
    var subscribedChannels = obs_subscribed_channels(get_id())

    return feed_summary((opts) => {
      return pull(
        sbot_log(opts),
        pull.map(matchesChannel)
      )
    }, [
      h('PageHeading', [
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
      message_compose({type: 'post', channel: channel}, {placeholder: 'Write a message in this channel\n\n\n\nPeople who follow you or subscribe to this channel will also see this message in their main feed.\n\nTo create a new channel, type the channel name (preceded by a #) into the search box above. e.g #cat-pics'})
    ])
  }

  // scoped

  function matchesChannel (msg) {
    if (msg.sync) console.error('SYNC', msg)
    var c = msg && msg.value && msg.value.content
    if (c && c.channel === channel) {
      return msg
    } else {
      return {timestamp: msg.timestamp}
    }
  }
}

exports.message_meta = function (msg) {
  var chan = msg.value.content.channel
  if (chan) {
    return h('a.channel', {href: '##' + chan}, '#' + chan)
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
