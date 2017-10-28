var Sustained = require('./sustained')
var Value = require('mutant/value')

module.exports = function (root, delay) {
  var target = Value()
  root.addEventListener('mouseover', (ev) => {
    var anchor = null
    for (var n = ev.target; n.parentNode; n = n.parentNode) {
      if (n.nodeName === 'A') {
        anchor = n
        break
      }
    }
    target.set(anchor)
  })

  root.addEventListener('mouseleave', (ev) => {
    target.set(false)
  })

  var result = Sustained(target, delay || 500, (v) => {
    return v === undefined
  })

  result.cancel = () => target.set(undefined)
  return result
}
