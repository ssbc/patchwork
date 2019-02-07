const { Value, watch } = require('mutant')

module.exports = MutantAsyncComputed

function MutantAsyncComputed (input, lambda) {
  var obs = Value()
  watch(obs, (value) => {
    lambda(value, (result) => {
      obs.set(result)
    })
  })
  return obs
}
