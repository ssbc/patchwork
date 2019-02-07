const { Value, computed } = require('mutant')

module.exports = MutantAsyncComputed

function MutantAsyncComputed (input, lambda, { defaultValue } = {}) {
  var lastValue = defaultValue
  return computed([input], (value) => {
    var obs = Value(lastValue)
    lambda(value, (result) => {
      obs.set(result)
      lastValue = result
    })
    return obs
  })
}
