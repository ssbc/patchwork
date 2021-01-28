const { h } = require('mutant')
const nest = require('depnest')
const extend = require('xtend')
const ref = require('ssb-ref')

exports.needs = nest({
  'message.html': {
    decorate: 'reduce',
    layout: 'first'
  },
  'message.html.markdown': 'first',
  'profile.html.person': 'first',
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

      const reason = msg.value.content.reason || msg.value.content.comment
      let element
      if (msg.value.content.blocking && reason !== undefined && reason !== null) {
        element = api.message.html.layout(msg, extend({
          content: messageContentFull(msg),
          layout: 'default'
        }, opts))
      } else {
        element = api.message.html.layout(msg, extend({
          miniContent: messageContentMini(msg),
          layout: 'mini'
        }, opts))
      }

      return api.message.html.decorate(element, {
        msg
      })
    }
  })

  function messageContentFull (msg) {
    const following = msg.value.content.following
    const blocking = msg.value.content.blocking

    if (blocking === true) {
      const reason = msg.value.content.reason || msg.value.content.comment
      const blockee = msg.value.content.contact
      return h('Markdown', [
        h('div', {}, ['blocked ', h('a', { href: blockee }, api.profile.html.person(blockee))]),
        h('div', {}, api.message.html.markdown(reason))
      ])
    } else if (typeof following === 'boolean') {
      return [
        following ? i18n('followed ') : i18n('unfollowed '),
        api.profile.html.person(msg.value.content.contact)
      ]
    } else if (blocking === false) {
      return [
        i18n('unblocked '), api.profile.html.person(msg.value.content.contact)
      ]
    }
  }

  function messageContentMini (msg) {
    const following = msg.value.content.following
    const blocking = msg.value.content.blocking

    if (blocking === true) {
      return [
        i18n('blocked '), api.profile.html.person(msg.value.content.contact)
      ]
    } else if (typeof following === 'boolean') {
      return [
        following ? i18n('followed ') : i18n('unfollowed '),
        api.profile.html.person(msg.value.content.contact)
      ]
    } else if (blocking === false) {
      return [
        i18n('unblocked '), api.profile.html.person(msg.value.content.contact)
      ]
    }
  }

  function isRenderable (msg) {
    if (msg.value.content.type !== 'contact') return
    if (!ref.isFeed(msg.value.content.contact)) return
    if (typeof msg.value.content.following !== 'boolean' && typeof msg.value.content.blocking !== 'boolean') return
    return true
  }
}
