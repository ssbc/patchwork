var h = require('mutant/h')
var nest = require('depnest')
var extend = require('xtend')
var ref = require('ssb-ref')

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first'
  },
  'about.obs.latestValue': 'first',
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
    render: function about (msg, opts) {
      if (!isRenderable(msg)) return

      var action = i18n('made changes to')
      var target = msg.value.content.about
      var title = api.about.obs.latestValue(target, 'title')
      var element = api.message.html.layout(msg, extend({
        showActions: true,
        miniContent: [action, ' ', h('a', {
          href: target
        }, title)],
        layout: 'mini'
      }, opts))

      return api.message.html.decorate(element, {
        msg
      })
    }
  })

  function isRenderable (msg) {
    if (msg.value.content.type !== 'about') return
    if (!ref.isMsg(msg.value.content.about)) return
    return true
  }
}
