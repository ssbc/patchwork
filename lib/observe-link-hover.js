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

  var active = Value(false)

  var result = Sustained(Sustained(target, 50), delay || 500, (v) => {
    // immediately switch to new hover (with 50 ms delay) if there is a current hover in place
    return v === undefined || (active() && v && v !== result())
  })

  result.cancel = () => target.set(undefined)
  result.active = active
  return result
}
