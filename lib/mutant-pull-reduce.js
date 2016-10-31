var pullPause = require('pull-pause')
var Value = require('@mmckegg/mutant/value')
var LazyWatcher = require('@mmckegg/mutant/lib/lazy-watcher')

var pull = require('pull-stream')

module.exports = function (stream, reducer, opts) {
  var pauser = pullPause((paused) => {})
  var seq = 0
  var lastSeq = -1
  pauser.pause()

  var binder = LazyWatcher(update, pauser.resume, pauser.pause)
  var result = function MutantPullReduce (listener) {
    if (!listener) {
      return binder.getValue()
    }
    return binder.addListener(listener)
  }

  binder.value = opts.startValue
  binder.nextTick = opts.nextTick
  result.sync = Value(false)

  pull(
    stream,
    pauser,
    pull.drain((item) => {
      if (item.sync) {
        result.sync.set(true)
      } else {
        seq += 1
        binder.value = reducer(binder.value, item)
        binder.onUpdate()
      }
    })
  )

  return result

  // scoped

  function update () {
    if (!binder.live) {
      // attempt to push through sync changes
      pauser.resume()
      pauser.pause()
    }

    if (lastSeq !== seq) {
      seq = lastSeq
      return true
    }
  }
}
