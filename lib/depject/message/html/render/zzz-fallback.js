const { h } = require('mutant')
const nest = require('depnest')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'message.html.markdown': 'first',
  'message.html': {
    layout: 'first',
    render: 'first'
  }
})

exports.gives = nest('message.html.render')

exports.create = function (api) {
  // no fallback unless renderUnknown is specified
  const i18n = api.intl.sync.i18n

  return nest('message.html.render', (msg, { renderUnknown = false } = {}) => {
    if (renderUnknown) {
      return api.message.html.layout(msg, {
        miniContent: [h('strong', i18n('Unknown Message Type:')), ' ', msg.value.content.type],
        content: api.message.html.markdown('```json\n' + JSON.stringify(msg.value.content, null, 2) + '\n```', {
          classList: '-fullCode'
        }),
        layout: 'mini',
        actions: false
      })
    } else {
      return null
    }
  })
}
