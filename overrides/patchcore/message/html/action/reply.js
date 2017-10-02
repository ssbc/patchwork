var h = require('mutant/h')
var nest = require('depnest')

exports.needs = nest({'intl.sync.i18n': 'first'})

exports.gives = nest('message.html.action')

exports.create = (api) => {
  const i18n = api.intl.sync.i18n
  return nest('message.html.action', function reply (msg) {
    return h('a', { href: msg.key, anchor: 'reply' }, i18n('Reply'))
  })
}
