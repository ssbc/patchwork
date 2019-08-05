var Pushable = require('pull-pushable')
var deepEqual = require('deep-equal')

module.exports = function (ssb) {
  return {
    stream: function () {
      var lastValue = deepClone(ssb.progress())

      var timer = setInterval(() => {
        var newValue = ssb.progress()
        if (!deepEqual(newValue, lastValue)) {
          lastValue = deepClone(newValue)
          pushable.push(lastValue)
        }
      }, 200)

      var pushable = Pushable(() => {
        clearInterval(timer)
      })

      pushable.push(lastValue)
      return pushable
    }
  }
}

function deepClone (obj) {
  return JSON.parse(JSON.stringify(obj))
}
