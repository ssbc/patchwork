var plugs = require('patchbay/plugs')
var extend = require('xtend')
var message_compose = plugs.first(exports.message_compose = [])
var sbot_log = plugs.first(exports.sbot_log = [])
var feed_summary = plugs.first(exports.feed_summary = [])
var h = require('hyperscript')
var pull = require('pull-stream')
var sbot_query = plugs.first(exports.sbot_query = [])

exports.screen_view = function (path, sbot) {
  if (path[0] === '#') {
    var channel = path.substr(1)
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
