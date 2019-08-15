const h = require('mutant/h')
const nest = require('depnest')
const extend = require('xtend')

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first'
  },
  'intl.sync.i18n': 'first'
})

exports.gives = nest('message.html', {
  canRender: true,
  render: true
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('message.html', {
    canRender: isRenderable,
    render: function (msg, opts) {
      if (!isRenderable(msg)) return
      const element = api.message.html.layout(msg, extend({
        miniContent: messageContent(msg),
        layout: 'mini'
      }, opts))

      return api.message.html.decorate(element, {
        msg
      })
    }
  })

  function messageContent (msg) {
    const channel = `#${msg.value.content.channel}`
    const subscribed = msg.value.content.subscribed
    return [
      subscribed ? i18n('subscribed to ') : i18n('unsubscribed from '),
      h('a', {
        href: channel
      }, channel)
    ]
  }
}

function isRenderable (msg) {
  return msg.value.content.type === 'channel' ? true : undefined
}
