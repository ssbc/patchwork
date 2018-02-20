var h = require('mutant/h')
var nest = require('depnest')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'app.navigate': 'first',
  'message.sync.root': 'first'

})

exports.gives = nest('message.html.action')

exports.create = (api) => {
  const i18n = api.intl.sync.i18n
  return nest('message.html.action', function reply (msg) {
    return h('a', { href: msg.key, anchor: 'reply', 'ev-click': {handleEvent, api, msg} }, i18n('Reply'))
  })
}

function handleEvent (ev) {
  var {api, msg} = this
  var el = getMessageElement(ev.target)
  
  // HACK: if this is the last message in the list, reply to the root message
  if (el && !el.nextElementSibling) {
    api.app.navigate(api.message.sync.root(msg), 'reply')
    ev.preventDefault()
  }
}

function getMessageElement (el) {
  while (el && el.classList) {
    if (el.classList.contains('Message') && el.parentNode && el.parentNode.classList.contains('replies')) {
      return el
    }
    el = el.parentNode
  }
}