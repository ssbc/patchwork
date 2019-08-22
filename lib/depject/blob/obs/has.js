const nest = require('depnest')
const pull = require('pull-stream')
const Value = require('mutant/value')
const onceTrue = require('mutant/once-true')
const defer = require('pull-defer')

exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.gives = nest('blob.obs.has', true)

exports.create = function (api) {
  let cbs = null

  return nest('blob.obs.has', function (id) {
    const value = Value()
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
  const stream = defer.source()
  onceTrue(connection, function (connection) {
    stream.resolve(fn(connection))
  })
  return stream
}
