var ref = require('ssb-ref')
var h = require('hyperscript')
var extend = require('xtend')

var plugs = require('patchbay/plugs')
var sbot_user_feed = plugs.first(exports.sbot_user_feed = [])
var avatar_profile = plugs.first(exports.avatar_profile = [])
var feed_summary = plugs.first(exports.feed_summary = [])

exports.screen_view = function (id) {
  if (ref.isFeed(id)) {
    return feed_summary((opts) => {
      return sbot_user_feed(extend(opts, {id: id}))
    }, [
      h('div', [avatar_profile(id)])
    ], {
      windowSize: 50
    })
  }
}
