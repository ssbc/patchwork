var when = require('@mmckegg/mutant/when')
var send = require('@mmckegg/mutant/send')
var plugs = require('patchbay/plugs')
var extend = require('xtend')
var message_compose = plugs.first(exports.message_compose = [])
var sbot_log = plugs.first(exports.sbot_log = [])
var feed_summary = plugs.first(exports.feed_summary = [])
var h = require('../lib/h')
var pull = require('pull-stream')
var sbot_query = plugs.first(exports.sbot_query = [])
var obs_subscribed_channels = plugs.first(exports.obs_subscribed_channels = [])
var get_id = plugs.first(exports.get_id = [])
var publish = plugs.first(exports.sbot_publish = [])

exports.screen_view = function (path, sbot) {
  if (path[0] === '#') {
    var channel = path.substr(1)
    var subscribedChannels = obs_subscribed_channels(get_id())

    return feed_summary((opts) => {
      if (opts.old === false) {
        return pull(
          sbot_log(opts),
          pull.filter(matchesChannel)
        )
      } else {
        return sbot_query(extend(opts, {query: [
          {$filter: {value: {content: {channel: channel}}}}
        ]}))
      }
    }, [
      h('PageHeading', [
        h('h1', `#${channel}`),
        h('div.meta', [
          when(subscribedChannels.has(channel),
            h('a -unsubscribe', {
              'href': '#',
              'title': 'Click to unsubscribe',
              'ev-click': send(unsubscribe, channel.id)
            }, 'Subscribed'),
            h('a -subscribe', {
              'href': '#',
              'ev-click': send(subscribe, channel.id)
            }, 'Subscribe')
          )
        ])
      ]),
      message_compose({type: 'post', channel: channel})
    ])
  }

  // scoped

  function matchesChannel (msg) {
    if (msg.sync) console.error('SYNC', msg)
    var c = msg && msg.value && msg.value.content
    return c && c.channel === channel
  }
}

exports.message_meta = function (msg) {
  var chan = msg.value.content.channel
  if (chan) {
    return h('a', {href: '##' + chan}, '#' + chan)
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
