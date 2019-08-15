const pull = require('pull-stream')
const Value = require('mutant/value')
const computed = require('mutant/computed')
const throttle = require('mutant/throttle')
const nest = require('depnest')
const hr = 60 * 60 * 1000

exports.needs = nest({
  'sbot.pull.stream': 'first'
})

exports.gives = nest('profile.obs.recentlyUpdated')

exports.create = function (api) {
  let loading = false

  const sync = Value(false)
  const result = Value([])
  const instance = throttle(result, 2000)
  instance.sync = sync

  instance.has = function (value) {
    return computed(instance, x => x.includes(value))
  }

  // refresh every 10 mins
  setInterval(load, 10 * 60e3)

  return nest('profile.obs.recentlyUpdated', function () {
    load()
    return instance
  })

  function load () {
    if (loading) return
    loading = true
    const max = 1000

    pull(
      api.sbot.pull.stream(sbot => sbot.patchwork.recentFeeds({
        since: Date.now() - (7 * 24 * hr),
        live: false
      })),
      pull.collect((err, items) => {
        if (err) return
        items.length = Math.min(items.length, max)
        result.set(items)
        sync.set(true)
        loading = false
      })
    )
  }
}
