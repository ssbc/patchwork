var watch = require('mutant/watch')

module.exports = AnchorHook

function AnchorHook (name, current, cb) {
  return function (element) {
    return watch(current, (current) => {
      if (current === name) {
        window.requestAnimationFrame(() => {
          element.scrollIntoView()

          // HACK: due to a browser bug, sometimes the body gets affected!?
          // Why not just hack it!!!
          if (document.body.scrollTop > 0) {
            document.body.scrollTop = 0
          }

          if (typeof cb === 'function') cb(element)
        })
      }
    })
  }
}
