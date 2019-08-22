const pull = require('pull-stream')
const Abortable = require('pull-abortable')
const LazyWatcher = require('mutant/lib/lazy-watcher')
const Value = require('mutant/value')

module.exports = createPullValue

function createPullValue (getStream, {
  nextTick = false,
  idle = false,
  onListen = null,
  onUnlisten = null,
  defaultValue = null,
  sync = null
} = {}) {
  const state = { getStream, onListen, onUnlisten }
  const binder = LazyWatcher.call(state, update, listen, unlisten)
  binder.value = defaultValue
  if (nextTick) binder.nextTick = true
  if (idle) binder.idle = true
  state.binder = binder
  const result = MutantPullValue.bind(state)
  if (sync) {
    state.sync = result.sync = Value(false)
  }
  return result
}

function MutantPullValue (listener) {
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
    this.getStream(),
    abortable,
    pull.drain((value) => {
      if (this.sync && !this.sync()) this.sync.set(true)
      this.binder.value = value
      this.binder.broadcast()
    })
  )
  if (typeof this.onListen === 'function') {
    this.onListen()
  }
}

function unlisten () {
  if (this.abort) {
    this.abort()
    this.abort = null
  }
  if (typeof this.onUnlisten === 'function') {
    this.onUnlisten()
  }
}
