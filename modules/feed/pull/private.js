const pull = require('pull-stream')
const nest = require('depnest')
const defer = require('pull-defer')
const onceTrue = require('mutant/once-true')

exports.gives = nest('feed.pull.private')
exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.create = function (api) {
  return nest('feed.pull.private', function (opts) {
    // HACK: needed to select correct index and handle lt

    opts.query = [
      {$filter: {
        timestamp: opts.lt
          ? {$lt: opts.lt}
          : {$gt: 0}
      }}
    ]

    delete opts.lt

    return StreamWhenConnected(api.sbot.obs.connection, (sbot) => {
      return pull(
        sbot.private.read(opts)
      )
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
