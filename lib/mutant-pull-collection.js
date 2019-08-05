const pull = require('pull-stream')
const Abortable = require('pull-abortable')
const LazyWatcher = require('mutant/lib/lazy-watcher')

module.exports = createPullCollection

function createPullCollection (getStream, opts) {
  const state = { getStream }
  const binder = LazyWatcher.call(state, update, listen, unlisten)
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
  const abortable = Abortable()
  this.abort = abortable.abort
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
