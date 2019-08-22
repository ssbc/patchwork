const pull = require('pull-stream')
const Abortable = require('pull-abortable')
const LazyWatcher = require('mutant/lib/lazy-watcher')
const Value = require('mutant/value')

module.exports = createPullDict

function createPullDict (getStream, { nextTick = null, idle = null, checkDelete = null, sync = null } = {}) {
  const state = { getStream, checkDelete }
  const binder = LazyWatcher.call(state, update, listen, unlisten)
  binder.value = {}
  if (nextTick) binder.nextTick = true
  if (idle) binder.idle = true
  state.binder = binder
  const result = MutantPullDict.bind(state)
  if (sync) {
    state.sync = result.sync = Value(false)
  }
  return result
}

function MutantPullDict (listener) {
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
      Object.keys(value).forEach((key) => {
        if (typeof this.checkDelete === 'function' && this.checkDelete(value[key])) {
          delete value[key]
        } else {
          this.binder.value[key] = value[key]
        }
      })
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
