const Pushable = require('pull-pushable')
const deepEqual = require('deep-equal')

module.exports = function (ssb) {
  return {
    stream: function () {
      let lastValue = deepClone(ssb.progress())

      const timer = setInterval(() => {
        const newValue = ssb.progress()
        if (!deepEqual(newValue, lastValue)) {
          lastValue = deepClone(newValue)
          pushable.push(lastValue)
        }
      }, 200)

      const pushable = Pushable(() => {
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
