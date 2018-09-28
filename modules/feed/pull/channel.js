const nest = require('depnest')
const extend = require('xtend')
var pull = require('pull-stream')

exports.gives = nest('feed.pull.channel')
exports.needs = nest({
  'sbot.pull.backlinks': 'first',
  'channel.sync.normalize': 'first',
  'message.sync.isBlocked': 'first',
  'message.sync.timestamp': 'first'
})

exports.create = function (api) {
  return nest('feed.pull.channel', function (channel) {
    channel = api.channel.sync.normalize(channel)
    if (typeof channel !== 'string') throw new Error('a channel name be specified')

    return function (opts) {
      // handle last item passed in as lt
      var lt = (opts.lt && opts.lt.value)
        ? api.message.sync.timestamp(opts.lt)
        : opts.lt

      delete opts.lt

      var filter = {
        dest: `#${channel}`,
        rts: typeof lt === 'number' ? {$lt: lt, $gt: 0} : {$gt: 0}
      }

      return pull(
        api.sbot.pull.backlinks(extend(opts, {
          query: [
            {$filter: filter}
          ]
        })),
        pull.filter(msg => !api.message.sync.isBlocked(msg))
      )
    }
  })
}
