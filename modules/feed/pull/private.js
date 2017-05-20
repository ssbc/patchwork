const pull = require('pull-stream')
const nest = require('depnest')
const extend = require('xtend')
const defer = require('pull-defer')
const onceTrue = require('mutant/once-true')

exports.gives = nest('feed.pull.private')
exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.create = function (api) {
  return nest('feed.pull.private', function (opts) {
    // HACK: handle lt/gt
    if (opts.lt != null) {
      opts.query = [
        {$filter: {
          timestamp: {$gte: 0, $lt: opts.lt}
        }}
      ]
      delete opts.lt
    }

    return StreamWhenConnected(api.sbot.obs.connection, (sbot) => {
      return (sbot.private && sbot.private.read || pull.empty)(opts)
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
