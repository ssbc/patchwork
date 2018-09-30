var pull = require('pull-stream')
var nest = require('depnest')
var HLRU = require('hashlru')

exports.needs = nest({
  'backlinks.obs.for': 'first',
  'sbot.async.get': 'first',
  'message.sync.isBlocked': 'first',
  'message.sync.root': 'first',
  'message.sync.unbox': 'first',
  'feed.pull.withReplies': 'first',
  'feed.pull.unique': 'first'
})

exports.gives = nest('feed.pull.rollup', true)

exports.create = function (api) {
  // cache mostly just to avoid reading the same roots over and over again
  // not really big enough for multiple refresh cycles
  var cache = HLRU(100)

  return nest('feed.pull.rollup', function (rootFilter) {
    return pull(
      pull.map(msg => {
        if (msg.value) {
          var root = api.message.sync.root(msg)
          if (!root) {
            // already a root, pass thru!
            return msg
          } else {
            return root
          }
        }
      }),

      // UNIQUE
      api.feed.pull.unique(),

      // LOOKUP (if needed)
      pull.asyncMap((keyOrMsg, cb) => {
        if (keyOrMsg.value) {
          cb(null, keyOrMsg)
        } else {
          var key = keyOrMsg
          if (cache.has(key)) {
            cb(null, cache.get(key))
          } else {
            api.sbot.async.get(key, (_, value) => {
              var msg = {key, value}
              if (msg.value) {
                cache.set(key, msg)
              }
              cb(null, msg)
            })
          }
        }
      }),

      // UNBOX (if needed)
      pull.map(msg => {
        if (msg.value && typeof msg.value.content === 'string') {
          var unboxed = api.message.sync.unbox(msg)
          if (unboxed) return unboxed
        }
        return msg
      }),

      // FILTER
      pull.filter(msg => msg && msg.value),
      pull.filter(rootFilter || (() => true)),
      pull.filter(msg => !api.message.sync.isBlocked(msg)),

      // ADD REPLIES
      api.feed.pull.withReplies()
    )
  })
}
