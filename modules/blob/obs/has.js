var nest = require('depnest')
var pull = require('pull-stream')
var Value = require('mutant/value')
var onceTrue = require('mutant/once-true')
var defer = require('pull-defer')

exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.gives = nest('blob.obs.has', true)

exports.create = function (api) {
  var cbs = null

  return nest('blob.obs.has', function (id) {
    var value = Value()
    onceTrue(api.sbot.obs.connection, sbot => {
      sbot.blobs.has(id, (_, has) => {
        if (has) {
          value.set(true)
        } else {
          value.set(false)
          waitFor(id, () => value.set(true))
        }
      })
    })
    return value
  })

  function waitFor (id, cb) {
    if (!cbs) {
      cbs = {}
      pull(
        StreamWhenConnected(api.sbot.obs.connection, sbot => sbot.blobs.ls({ old: false })),
        pull.drain(blob => {
          if (cbs[blob]) {
            while (cbs[blob].length) {
              cbs[blob].pop()()
            }
            delete cbs[blob]
          }
        })
      )
    }
    if (!cbs[id]) cbs[id] = []
    cbs[id].push(cb)
  }
}

function StreamWhenConnected (connection, fn) {
  var stream = defer.source()
  onceTrue(connection, function (connection) {
    stream.resolve(fn(connection))
  })
  return stream
}
