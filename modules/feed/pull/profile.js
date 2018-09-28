const nest = require('depnest')
const extend = require('xtend')
const pull = require('pull-stream')

exports.gives = nest('feed.pull.profile')
exports.needs = nest('sbot.pull.userFeed', 'first')
exports.create = function (api) {
  return nest('feed.pull.profile', (id) => {
    // handle last item passed in as lt
    return function (opts) {
      opts = extend(opts, {
        id, lt: (opts.lt && opts.lt.value) ? opts.lt.value.sequence : opts.lt
      })
      return pull(
        api.sbot.pull.userFeed(opts),
        pull.filter(msg => {
          return typeof msg.value.content !== 'string'
        })
      )
    }
  })
}
