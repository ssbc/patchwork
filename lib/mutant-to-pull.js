var watch = require('mutant/watch')
var pushable = require('pull-pushable')

module.exports = function (obs) {
  var releases = []

  // create listener with `onClose` handler
  var listener = pushable(function onClose () {
    // if listener is found, delete from list
    while (releases.length) {
      releases.pop()()
    }
  })

  releases.push(watch(obs, (value) => {
    listener.push(value)
  }))

  return listener
}
