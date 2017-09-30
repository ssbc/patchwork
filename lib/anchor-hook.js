var watch = require('mutant/watch')

module.exports = AnchorHook

function AnchorHook (name, current, cb) {
  return function (element) {
    return watch(current, (current) => {
      if (current === name) {
        window.requestAnimationFrame(() => {
          element.scrollIntoView()
          if (typeof cb === 'function') cb(element)
        })
      }
    })
  }
}
