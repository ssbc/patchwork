var pull = require('pull-stream')
var Value = require('mutant/value')
var computed = require('mutant/computed')
var throttle = require('mutant/throttle')
var nest = require('depnest')
var hr = 60 * 60 * 1000

exports.needs = nest({
  'sbot.pull.stream': 'first'
})

exports.gives = nest('profile.obs.recentlyUpdated')

exports.create = function (api) {
  var instance = null

  return nest('profile.obs.recentlyUpdated', function () {
    load()
    return instance
  })

  function load () {
    if (instance) return

    var sync = Value(false)
    var result = Value([])
    var max = 1000

    pull(
      api.sbot.pull.stream(sbot => sbot.patchwork.recentFeeds({
        since: Date.now() - (7 * 24 * hr),
        live: true
      })),
      pull.drain((id) => {
        if (id.sync) {
          result.set(result())
          sync.set(true)
        } else {
          var values = result()
          var index = values.indexOf(id)
          if (sync()) {
            values.length = Math.max(values.length, max)
            if (~index) values.splice(index, 1)
            values.unshift(id)
            result.set(values)
          } else if (values.length < max) {
            values.push(id)
            // don't broadcast until sync
          }
        }
      })
    )

    instance = throttle(result, 2000)
    instance.sync = sync

    instance.has = function (value) {
      return computed(instance, x => x.includes(value))
    }
  }
}
