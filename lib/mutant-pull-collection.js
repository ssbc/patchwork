var pull = require('pull-stream')
var Abortable = require('pull-abortable')
var LazyWatcher = require('mutant/lib/lazy-watcher')

module.exports = createPullCollection

function createPullCollection (getStream, opts) {
  var state = { getStream }
  var binder = LazyWatcher.call(state, update, listen, unlisten)
  binder.value = []
  if (opts && opts.nextTick) binder.nextTick = true
  if (opts && opts.idle) binder.idle = true
  state.binder = binder
  return MutantPullCollection.bind(state)
}

function MutantPullCollection (listener) {
  if (!listener) {
    return this.binder.getValue()
  }
  return this.binder.addListener(listener)
}

function update () {
  // this is only run on the item when no one is listening (use a onceTrue instead of resolve)
  // since we don't have an synchronous way to check, ignore
}

function listen () {
  var abortable = Abortable()
  this.aborter = abortable.abort
  pull(
    this.getStream(this.lastValue),
    abortable,
    pull.drain((value) => {
      if (value && value.sync) return
      this.lastValue = value
      this.binder.value.push(value)
      this.binder.broadcast()
    })
  )
}

function unlisten () {
  if (this.abort) {
    this.abort()
    this.abort = null
  }
}
