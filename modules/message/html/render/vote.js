var nest = require('depnest')
var extend = require('xtend')

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first',
    link: 'first'
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

      var element = api.message.html.layout(msg, extend({
        miniContent: messageContent(msg),
        layout: 'mini',
        actions: false
      }, opts))

      return api.message.html.decorate(element, {
        msg
      })
    }
  })

  function messageContent (msg) {
    var liked = msg.value.content.vote.value > 0
    var link = msg.value.content.vote.link

    if (liked) {
      return [ i18n('liked'), ' ', api.message.html.link(link) ]
    } else {
      return [ i18n('unliked'), ' ', api.message.html.link(link) ]
    }
  }

  function isRenderable (msg) {
    return (msg.value.content.type === 'vote' ? true : undefined) && msg.value.content.vote
  }
}
