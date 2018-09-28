const nest = require('depnest')
const defer = require('pull-defer')
const pull = require('pull-stream')
const onceTrue = require('mutant/once-true')

exports.gives = nest('feed.pull.private')
exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.create = function (api) {
  return nest('feed.pull.private', function (opts) {
    // handle last item passed in as lt
    var lt = (opts.lt && opts.lt.value)
      ? opts.lt.timestamp
      : opts.lt
    delete opts.lt

    // HACK: needed to select correct index and handle lt
    opts.query = [
      {$filter: {
        timestamp: typeof lt === 'number'
          ? {$lt: lt, $gt: 0}
          : {$gt: 0}
      }}
    ]

    return StreamWhenConnected(api.sbot.obs.connection, (sbot) => {
      if (!sbot.private || !sbot.private.read) return pull.empty()
      return sbot.private.read(opts)
    })
  })
}

function StreamWhenConnected (connection, fn) {
  var stream = defer.source()
  onceTrue(connection, function (connection) {
    stream.resolve(fn(connection))
  })
  return stream
}
