var { h } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'sheet.editTags': 'first'
})

exports.gives = nest('message.html.action')

exports.create = (api) => {
  return nest('message.html.action', msg => {
    return h('a.tag', {
      href: '#',
      'ev-click': () => api.sheet.editTags({ msgId: msg.key }, console.log)
    }, 'Tag')
  })
}
