const Pushable = require('pull-pushable')
const deepEqual = require('deep-equal')

module.exports = function (ssb) {
  return {
    stream: function () {
      let lastValue = deepClone(ssb.status())
      lastValue = {
        ...lastValue.progress,
        plugins: lastValue.sync.plugins,
      }

      const timer = setInterval(() => {
        let newValue = deepClone(ssb.status())
        newValue = {
          ...newValue.progress,
          plugins: newValue.sync.plugins,
        }
        if (!deepEqual(newValue, lastValue)) {
          lastValue = newValue
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
