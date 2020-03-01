const watch = require('mutant/watch')
const computed = require('mutant/computed')
const Value = require('mutant/value')

module.exports = Sustained

// only broadcast value changes once a truthy value has stayed constant for more than timeThreshold

function Sustained (obs, timeThreshold, checkUpdateImmediately) {
  const outputValue = Value(obs())
  let lastValue = null
  let timer = null

  return computed(outputValue, v => v, {
    onListen: () => watch(obs, onChange)
  })

  function onChange (value) {
    if (checkUpdateImmediately && checkUpdateImmediately(value)) {
      clearTimeout(timer)
      update()
    } else if (value !== lastValue) {
      clearTimeout(timer)
      const delay = typeof timeThreshold === 'function' ? timeThreshold(value, outputValue()) : timeThreshold
      timer = setTimeout(update, delay)
    }
    lastValue = value
  }

  function update () {
    const value = obs()
    if (value !== outputValue()) {
      outputValue.set(value)
    }
  }
}
