const { Value, computed } = require('mutant')

module.exports = MutantAsyncComputed

function MutantAsyncComputed (input, getNewItems, { defaultValue } = {}) {
  var collection = defaultValue || []
  var lastValue = null
  return computed([input], (value) => {
    var obs = Value(collection)
    getNewItems(lastValue, (newItems) => {
      newItems.forEach((item) => collection.push(item))
      obs.set(collection)
    })
    lastValue = value
    return obs
  })
}
