var pull = require('pull-stream')
var Abortable = require('pull-abortable')
var LazyWatcher = require('mutant/lib/lazy-watcher')

module.exports = createPullDict

function createPullDict (getStream, opts) {
  var state = {getStream}
  var binder = LazyWatcher.call(state, update, listen, unlisten)
  binder.value = {}
  if (opts && opts.nextTick) binder.nextTick = true
  if (opts && opts.idle) binder.idle = true
  state.binder = binder
  return MutantPullDict.bind(state)
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
  var abortable = Abortable()
  this.aborter = abortable.abort
  pull(
    this.getStream(),
    abortable,
    pull.drain((value) => {
      if (value && value.sync) return
      Object.keys(value).forEach((key) => {
        this.binder.value[key] = value[key]
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
