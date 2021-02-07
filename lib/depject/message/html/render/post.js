const h = require('mutant/h')
const nest = require('depnest')
const extend = require('xtend')
const _ = require('lodash')
const addContextMenu = require('../../../../message/html/decorate/context-menu')

exports.needs = nest({
  'message.html': {
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

      const isBlocked = _.get(msg, 'value.meta.blockedBy.role') === 'me'

      const element = api.message.html.layout(msg, extend({
        title: messageTitle(msg),
        content: isBlocked ? i18n('Content of a blocked user') : messageContent(msg),
        layout: 'default'
      }, opts))

      return addContextMenu(element, {
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
    const root = data.value.content && data.value.content.root
    return !root ? null : h('span', ['re: ', api.message.html.link(root)])
  }
}
