var watch = require('mutant/watch')

module.exports = AnchorHook

function AnchorHook (name, current, cb) {
  return function (element) {
    return watch(current, (current) => {
      if (current === name) {
        window.requestAnimationFrame(() => {
          element.scrollIntoView()
          if (typeof cb === 'function') cb(element)

          // HACK: due to a browser bug, sometimes the window scrolls down below the top bar
          // Why not just hack it!!!
          var topBar = document.querySelector('.MainWindow > div.top')
          if (topBar) {
            topBar.scrollIntoViewIfNeeded()
          }
        })
      }
    })
  }
}
