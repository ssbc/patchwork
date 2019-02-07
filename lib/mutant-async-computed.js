const { Value, computed } = require('mutant')

module.exports = MutantAsyncComputed

function MutantAsyncComputed (input, lambda, { defaultValue } = {}) {
  return computed([input], (value) => {
    var result = Value(defaultValue)
    lambda(value, () => {
      result.set(value)
    })
    return result
  })
}
