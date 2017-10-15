var h = require('mutant/h')
var nest = require('depnest')
var extend = require('xtend')
var ref = require('ssb-ref')

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first'
  },
  'profile.html.person': 'first',
  'intl.sync.i18n': 'first',
})

exports.gives = nest('message.html', {
  canRender: true,
  render: true
})

exports.create = function(api) {
  const i18n = api.intl.sync.i18n
  return nest('message.html', {
    canRender: isRenderable,
    render: function(msg, opts) {
      if (!isRenderable(msg)) return

      var element = api.message.html.layout(msg, extend({
        miniContent: messageContent(msg),
        layout: 'mini'
      }, opts))

      return api.message.html.decorate(element, {
        msg
      })
    }
  })

  function messageContent(msg) {
    var following = msg.value.content.following
    var blocking = msg.value.content.blocking

    if (typeof blocking === 'boolean') {
      return [
        blocking ? i18n('blocked ') : i18n('unblocked '),
        api.profile.html.person(msg.value.content.contact)
      ]
    } else {
      return [
        following ? i18n('followed ') : i18n('unfollowed '),
        api.profile.html.person(msg.value.content.contact)
      ]
    }
  }

  function isRenderable(msg) {
    if (msg.value.content.type !== 'contact') return undefined
    else if (!ref.isFeed(msg.value.content.contact)) return undefined
    else if (typeof msg.value.content.following !== 'boolean' && typeof msg.value.content.blocking !== 'boolean') return undefined
    return true;
  }

}
