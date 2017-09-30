var h = require('mutant/h')
var nest = require('depnest')

exports.gives = nest('message.html.action')

exports.create = (api) => {
  return nest('message.html.action', function reply (msg) {
    return h('a', { href: msg.key, anchor: 'reply' }, 'Reply')
  })
}
