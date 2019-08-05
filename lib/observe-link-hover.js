const Sustained = require('./sustained')
const Value = require('mutant/value')

module.exports = function (root, delay) {
  const target = Value()
  root.addEventListener('mouseover', (ev) => {
    let anchor = null
    for (let n = ev.target; n.parentNode; n = n.parentNode) {
      if (n.nodeName === 'A') {
        anchor = n
        break
      }
    }
    target.set(anchor)
  })

  root.addEventListener('mouseleave', () => {
    target.set(false)
  })

  const result = Sustained(target, delay || 500, (v) => {
    return v === undefined
  })

  result.cancel = () => target.set(undefined)
  return result
}
