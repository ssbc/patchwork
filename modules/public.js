var plugs = require('patchbay/plugs')
var message_compose = plugs.first(exports.message_compose = [])
var sbot_log = plugs.first(exports.sbot_log = [])
var feed_summary = plugs.first(exports.feed_summary = [])

exports.screen_view = function (path, sbot) {
  if (path === '/public') {
    return feed_summary(sbot_log, [
      message_compose({type: 'post'}, {placeholder: 'Write a public message'})
    ])
  }
}
