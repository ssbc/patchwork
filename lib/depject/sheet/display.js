const h = require('mutant/h')
const nest = require('depnest')

exports.gives = nest('sheet.display')

exports.create = function () {
  return nest('sheet.display', function (handler) {
    const { content, footer, classList, onMount, attributes } = handler(done)

    let fullAttributes = { className: 'Sheet', classList }
    if (attributes !== undefined) {
      fullAttributes = { ...attributes, ...fullAttributes }
    }
    const container = h('div', fullAttributes, [
      h('section', [content]),
      h('footer', [footer])
    ])

    document.body.appendChild(container)

    if (onMount) onMount()

    function done () {
      document.body.removeChild(container)
    }
  })
}
