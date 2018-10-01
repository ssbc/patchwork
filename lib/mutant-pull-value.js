var pull = require('pull-stream')
var Abortable = require('pull-abortable')
var LazyWatcher = require('mutant/lib/lazy-watcher')

module.exports = createPullValue

function createPullValue (getStream, {nextTick, idle, onListen, onUnlisten} = {}) {
  var state = {getStream, onListen, onUnlisten}
  var binder = LazyWatcher.call(state, update, listen, unlisten)
  if (nextTick) binder.nextTick = true
  if (idle) binder.idle = true
  state.binder = binder
  return MutantPullValue.bind(state)
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
  var abortable = Abortable()
  this.aborter = abortable.abort
  pull(
    this.getStream(),
    abortable,
    pull.drain((value) => {
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
