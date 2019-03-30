var h = require('mutant/h')
var nest = require('depnest')

exports.gives = nest('sheet.display')

exports.create = function () {
  return nest('sheet.display', function (handler) {
    var { content, footer, classList, onMount } = handler(done)

    var container = h('div', { className: 'Sheet', classList }, [
      h('section', [content]),
      h('footer', [footer])
    ])

    // Closes the sheet when the user presses escape
    function escapeKeyListener(event) {
      event.stopPropagation()
      if (event.key === "Escape") done()
    }

    document.body.appendChild(container)

    document.addEventListener('keydown', escapeKeyListener)

    if (onMount) onMount()

    function done () {
      document.body.removeChild(container)
      document.removeEventListener('keydown', escapeKeyListener)
    }
  })
}
