const { computed, Dict } = require('mutant')

module.exports = MutantAsyncDict

function MutantAsyncDict (input, getNewItems, { defaultValue } = {}) {
  var obs = Dict(defaultValue)
  var lastValue = null
  return computed([input], (value) => {
    getNewItems(lastValue, (newItems) => {
      Object.keys(newItems).forEach((key) => obs.put(key, newItems[key]))
    })
    lastValue = value
    return obs
  })
}
