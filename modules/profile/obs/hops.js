var Value = require('mutant/value')
var computed = require('mutant/computed')
var Sustained = require('../../../lib/sustained')
var nest = require('depnest')

exports.needs = nest({
  'profile.obs.recentlyUpdated': 'first',
  'contact.obs.following': 'first',
  'sbot.obs.connection': 'first'
})

exports.gives = nest('profile.obs.hops')

exports.create = function (api) {
  return nest('profile.obs.hops', function (from, to) {
    // create observable value that refreshes hops whenever friend graph changes
    // and has stabilized for more than 500 ms
    // also only watches if observable is currently being observed

    var value = Value()
    var updates = IncrementableValue()
    var releases = []

    var fromFollowing = api.contact.obs.following(from)
    var toFollowing = api.contact.obs.following(to)

    return computed([value], (value) => value, {
      onListen: function () {
        releases.push(fromFollowing(updates.increment))
        releases.push(toFollowing(updates.increment))
        releases.push(api.sbot.obs.connection(updates.increment))
        releases.push(Sustained(updates, 500)(refresh))
        refresh()
      },
      onUnlisten: function () {
        while (releases.length) {
          releases.pop()()
        }
      }
    })

    // scoped
    function refresh () {
      if (api.sbot.obs.connection()) {
        api.sbot.obs.connection().patchwork.getHops({from, to}, (err, result) => {
          if (err) return console.log(err)
          value.set(result)
        })
      }
    }
  })
}

function IncrementableValue () {
  var value = Value(0)
  value.increment = function () {
    value.set((value() || 0) + 1)
  }
  return value
}
