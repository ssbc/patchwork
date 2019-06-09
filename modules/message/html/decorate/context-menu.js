const nest = require('depnest')

exports.gives = nest('message.html.decorate')

exports.create = (api) => {
  return nest('message.html.decorate', function (element, { msg }) {
    // accessed from lib/context-menu-and-spellcheck
    element.msg = { key: msg.key }
    return element
  })
}
