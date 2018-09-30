const h = require('mutant/h')
const nest = require('depnest')

exports.gives = nest('message.html.timestamp')
exports.needs = nest({
  'lib.obs.timeAgo': 'first',
  'message.sync.timestamp': 'first'
})

exports.create = function (api) {
  return nest('message.html.timestamp', timestamp)

  function timestamp (msg) {
    return h('a.Timestamp', {
      href: msg.key,
      title: new Date(api.message.sync.timestamp(msg))
    }, api.lib.obs.timeAgo(api.message.sync.timestamp(msg)))
  }
}
