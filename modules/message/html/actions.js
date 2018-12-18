var { h, when } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'intl.sync.i18n': 'first',
  'app.navigate': 'first',
  'message.sync.root': 'first',
  'keys.sync.id': 'first',
  'message.obs.doesLike': 'first',
  'sbot.async.publish': 'first',
  'sheet.editTags': 'first',
  'sbot.pull.stream': 'first'
})

exports.gives = nest('message.html.actions')

exports.create = (api) => {
  const i18n = api.intl.sync.i18n

  return nest('message.html.actions', function like (msg) {
    var liked = api.message.obs.doesLike(msg.key)

    return [
      when(liked,
        h('a.like -liked', {
          href: '#',
          title: i18n('Click to unlike'),
          'ev-click': () => publishLike(msg, false)
        }, i18n('Liked')),
        h('a.like', {
          href: '#',
          'ev-click': () => publishLike(msg, true)
        }, i18n('Like'))
      ),
      h('a.reply', {
        href: msg.key,
        anchor: 'reply',
        'ev-click': { handleEvent, api, msg }
      }, i18n('Reply')),
      h('a.tag -right', {
        href: '#',
        title: i18n('Add / Edit Tags'),
        'ev-click': () => api.sheet.editTags({ msgId: msg.key }, console.log)
      }, i18n('Tags'))
    ]
  })

  function publishLike (msg, status = true) {
    var like = status ? {
      type: 'vote',
      channel: msg.value.content.channel,
      vote: { link: msg.key, value: 1, expression: 'Like' }
    } : {
      type: 'vote',
      channel: msg.value.content.channel,
      vote: { link: msg.key, value: 0, expression: 'Unlike' }
    }
    if (msg.value.content.recps) {
      like.recps = msg.value.content.recps.map(function (e) {
        return e && typeof e !== 'string' ? e.link : e
      })
      like.private = true
    }
    api.sbot.async.publish(like)
  }
}

function handleEvent (ev) {
  var { api, msg } = this
  var el = getMessageElement(ev.target)

  // HACK: if this is the last message in the list, reply to the root message
  if (el && !el.nextElementSibling) {
    api.app.navigate(api.message.sync.root(msg), 'reply')
    ev.preventDefault()
  }
}

function getMessageElement (el) {
  while (el && el.classList) {
    if (el.classList.contains('Message') && el.parentNode && el.parentNode.classList.contains('replies')) {
      return el
    }
    el = el.parentNode
  }
}
