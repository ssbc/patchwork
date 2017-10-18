var h = require('mutant/h')
var Value = require('mutant/value')
var ref = require('ssb-ref')

var nest = require('depnest')

exports.needs = nest({
  'sbot.async.get': 'first',
  'profile.html.person': 'first',
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
    return h('Message -missing -reply', [
      h('header', [
        h('div.main', [
          h('div.main', [
            h('div.name', ['⚠️ ', h('strong', i18n('Missing message')), i18n(' via '), api.profile.html.person(hintMessage.value.author)]),
            h('div.meta', [h('a', {href: id}, id)])
          ])
        ])
      ]),
      h('section', [
        h('p', [i18n(`The author of this message could be outside of your follow range.`)])
      ])
    ])
  }
}
