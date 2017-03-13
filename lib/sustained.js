var watch = require('mutant/watch')
var computed = require('mutant/computed')
var Value = require('mutant/value')

module.exports = Sustained

// only broadcast value changes once a truthy value has stayed constant for more than timeThreshold

function Sustained (obs, timeThreshold, checkUpdateImmediately) {
  var outputValue = Value(obs())

  return computed(outputValue, v => v, {
    onListen: () => watch(obs, onChange)
  })

  function onChange (value) {
    if (checkUpdateImmediately && checkUpdateImmediately(value)) { // update immediately for falsy values
      clearTimeout()
      update()
    } else if (value !== outputValue()) {
      clearTimeout()
      setTimeout(update, timeThreshold)
    }
  }

  function update () {
    outputValue.set(obs())
  }
}
