var h = require('mutant/h')
var mutantMap = require('mutant/map')
var nest = require('depnest')
var extend = require('xtend')
var getRoot = require('../../../../lib/get-root')

exports.needs = nest({
  'keys.sync.id': 'first',
  'profile.html.person': 'first',
  'message.obs.get': 'first',
  'message.html': {
    decorate: 'reduce',
    layout: 'first',
    link: 'first',
    markdown: 'first'
  }
})

exports.gives = nest({
  'message.html': {
    canRender: true,
    render: true
  }
})

exports.create = function (api) {
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
