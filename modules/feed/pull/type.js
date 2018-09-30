const nest = require('depnest')
const extend = require('xtend')
const pull = require('pull-stream')

exports.gives = nest('feed.pull.type')
exports.needs = nest({
  'sbot.pull.messagesByType': 'first',
  'message.sync.isBlocked': 'first'
})

exports.create = function (api) {
  return nest('feed.pull.type', (type) => {
    if (typeof type !== 'string') throw new Error('a type must be specified')

    return function (opts) {
      opts = extend(opts, {
        type,
        // handle last item passed in as lt
        lt: opts.lt && typeof opts.lt === 'object' ? opts.lt.timestamp : opts.lt
      })

      return pull(
        api.sbot.pull.messagesByType(opts),
        pull.filter(msg => !api.message.sync.isBlocked(msg))
      )
    }
  })
}
