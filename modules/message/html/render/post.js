var h = require('mutant/h')
var nest = require('depnest')
var extend = require('xtend')

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first',
    link: 'first',
    markdown: 'first'
  },
  'intl.sync.i18n': 'first'
})

exports.gives = nest({
  'message.html': {
    canRender: true,
    render: true
  }
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n

  return nest('message.html', {
    canRender: isRenderable,
    render: function (msg, opts) {
      if (!isRenderable(msg)) return

      var element = api.message.html.layout(msg, extend({
        title: messageTitle(msg),
        content: msg.blockedBy && msg.blockedBy.role === 'me' ? i18n('Content of a blocked user') : messageContent(msg),
        layout: 'default'
      }, opts))

      return api.message.html.decorate(element, {
        msg
      })
    }
  })

  function isRenderable (msg) {
    return (msg.value.content.type === 'post') ? true : undefined
  }

  function messageContent (data) {
    if (!data.value.content || !data.value.content.text) return
    return h('div', {}, api.message.html.markdown(data.value.content))
  }

  function messageTitle (data) {
    var root = data.value.content && data.value.content.root
    return !root ? null : h('span', ['re: ', api.message.html.link(root)])
  }
}
