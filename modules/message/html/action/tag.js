var { h } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'sheet.editTags': 'first'
})

exports.gives = nest('message.html.action')

exports.create = (api) => {
  const i18n = api.intl.sync.i18n
  return nest('message.html.action', msg => {
    return h('a.tag', {
      href: '#',
      'ev-click': () => api.sheet.editTags({ msgId: msg.key }, console.log)
    }, i18n('Tag'))
  })
}
