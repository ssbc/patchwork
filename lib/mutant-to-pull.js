const watch = require('mutant/watch')
const pushable = require('pull-pushable')

module.exports = function (obs) {
  const releases = []

  // create listener with `onClose` handler
  const listener = pushable(function onClose () {
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
