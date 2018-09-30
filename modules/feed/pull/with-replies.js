var pull = require('pull-stream')
var nest = require('depnest')
var extend = require('xtend')
var resolve = require('mutant/resolve')
var onceTrue = require('mutant/once-true')

exports.needs = nest({
  'backlinks.obs.for': 'first',
  'message.sync.isBlocked': 'first',
  'message.sync.root': 'first'
})

exports.gives = nest('feed.pull.withReplies', true)

exports.create = function (api) {
  return nest('feed.pull.withReplies', function ({filterRepliesIfBlockedByRootAuthor = true} = {}) {
    return pull.asyncMap((rootMessage, cb) => {
      // use global backlinks cache
      var backlinks = api.backlinks.obs.for(rootMessage.key)
      onceTrue(backlinks.sync, () => {
        var replies = resolve(backlinks)
        if (filterRepliesIfBlockedByRootAuthor) {
          replies = replies.filter(msg => {
            return api.message.sync.root(msg) === rootMessage.key && !api.message.sync.isBlocked(msg, rootMessage)
          })
        }
        cb(null, extend(rootMessage, { replies }))
      })
    })
  })
}
