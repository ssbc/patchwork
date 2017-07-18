var nest = require('depnest')
var Value = require('mutant/value')
var onceTrue = require('mutant/once-true')
var computed = require('mutant/computed')
var resolve = require('mutant/resolve')
var pull = require('pull-stream')
var onceIdle = require('mutant/once-idle')
var sorted = require('sorted-array-functions')

exports.needs = nest({
  'sbot.pull.backlinks': 'first',
  'sbot.obs.connection': 'first',
  'sbot.pull.stream': 'first'
})

exports.gives = nest('backlinks.obs.for', true)

exports.create = function (api) {
  var cache = {}
  var collections = {}

  var loaded = false

  // cycle remove sets for fast cleanup
  var newRemove = new Set()
  var oldRemove = new Set()

  // run cache cleanup every 5 seconds
  // an item will be removed from cache between 5 - 10 seconds after release
  // this ensures that the data is still available for a page reload
  var timer = setInterval(() => {
    oldRemove.forEach(id => {
      if (cache[id]) {
        unsubscribe(id)
        delete collections[id]
        delete cache[id]
      }
    })
    oldRemove.clear()

    // cycle
    var hold = oldRemove
    oldRemove = newRemove
    newRemove = hold
  }, 5e3)

  if (timer.unref) timer.unref()

  return nest({
    'backlinks.obs.for': (id) => backlinks(id)
  })

  function backlinks (id) {
    load()
    if (!cache[id]) {
      var sync = Value(false)
      var collection = Value([])
      subscribe(id)

      // try not to saturate the thread
      onceIdle(() => {
        pull(
          api.sbot.pull.backlinks({
            query: [ {$filter: { dest: id }} ],
            index: 'DTA' // use asserted timestamps
          }),
          pull.drain((msg) => {
            var value = resolve(collection)
            sorted.add(value, msg, compareAsserted)
            collection.set(value)
          }, () => {
            sync.set(true)
          })
        )
      })

      collections[id] = collection
      cache[id] = computed([collection], x => x, {
        onListen: () => use(id),
        onUnlisten: () => release(id)
      })

      cache[id].sync = sync
    }
    return cache[id]
  }

  function load () {
    if (!loaded) {
      pull(
        api.sbot.pull.stream(sbot => sbot.patchwork.liveBacklinks.stream()),
        pull.drain(msg => {
          var collection = collections[msg.dest]
          if (collection) {
            var value = resolve(collection)
            value.push(msg)
            collection.set(value)
          }
        })
      )
      loaded = true
    }
  }

  function use (id) {
    newRemove.delete(id)
    oldRemove.delete(id)
  }

  function release (id) {
    newRemove.add(id)
  }

  function subscribe (id) {
    onceTrue(api.sbot.obs.connection(), (sbot) => sbot.patchwork.liveBacklinks.subscribe(id))
  }

  function unsubscribe (id) {
    onceTrue(api.sbot.obs.connection(), (sbot) => sbot.patchwork.liveBacklinks.unsubscribe(id))
  }
}

function compareAsserted (a, b) {
  if (isReplyTo(a, b)) {
    return -1
  } else if (isReplyTo(b, a)) {
    return 1
  } else {
    return a.value.timestamp - b.value.timestamp
  }
}

function isReplyTo (maybeReply, msg) {
  return (includesOrEquals(maybeReply.branch, msg.key))
}

function includesOrEquals (array, value) {
  if (Array.isArray(array)) {
    return array.includes(value)
  } else {
    return array === value
  }
}
