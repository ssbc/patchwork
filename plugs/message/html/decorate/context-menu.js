const nest = require('depnest')
const contextMenu = require('../../../../lib/context-menu')

exports.gives = nest('message.html.decorate')

exports.create = (api) => {
  return nest('message.html.decorate', function (element, { msg }) {
    element.addEventListener('contextmenu', contextMenu.bind(null, msg))
    element.msg = msg
    return element
  })
}
