var h = require('mutant/h')
var Value = require('mutant/value')
var when = require('mutant/when')
var ref = require('ssb-ref')

var nest = require('depnest')

exports.needs = nest({
  'sbot.async.get': 'first',
  'profile.html.person': 'first',
  'message.html.meta': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('message.html.missing')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('message.html.missing', function (id, hintMessage) {
    var result = Value()
    if (ref.isMsg(id)) {
      api.sbot.async.get(id, function (_, value) {
        if (!value) {
          result.set(messageMissing(id, hintMessage))
        }
      })
    }

    return result
  })

  function messageMissing (id, hintMessage) {
    var possibleAuthor = hintMessage.value.content.reply && hintMessage.value.content.reply[id]
    var msg = {
      key: id,
      value: {
        missing: true,
        author: ref.isFeed(possibleAuthor) ? possibleAuthor : null
      }
    }
    var element = h('Message -missing -reply', [
      h('header', [
        h('div.main', [
          h('div.main', [
            h('div.name', [
              '⚠️ ',
              msg.value.author
                ? [api.profile.html.person(msg.value.author), ' ', i18n('(missing message)')]
                : h('strong', i18n('Missing message')),
              i18n(' via '), api.profile.html.person(hintMessage.value.author)]),
            h('div.meta', [h('a', {href: id}, id)])
          ])
        ]),
        h('div.meta', [
          api.message.html.meta(msg)
        ])
      ]),
      h('section', [
        h('p', [i18n(`The author of this message could be outside of your follow range or they may be blocked.`)])
      ])
    ])

    element.msg = msg
    return element
  }
}
