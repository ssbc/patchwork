var pull = require('pull-stream')
var nest = require('depnest')

exports.needs = nest({
  'backlinks.obs.for': 'first',
  'sbot.async.get': 'first',
  'message.sync.isBlocked': 'first',
  'message.sync.root': 'first',
  'message.sync.unbox': 'first',
  'feed.pull.withReplies': 'first'
})

exports.gives = nest('feed.pull.unique', true)

exports.create = function (api) {
  return nest('feed.pull.unique', function (rootFilter) {
    var seen = new Set()
    return pull.filter(idOrMsg => {
      if (idOrMsg) {
        if (idOrMsg.key) idOrMsg = idOrMsg.key
        if (typeof idOrMsg === 'string') {
          var key = idOrMsg
          if (!seen.has(key)) {
            seen.add(key)
            return true
          }
        }
      }
    })
  })
}
