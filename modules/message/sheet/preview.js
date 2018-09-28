var h = require('mutant/h')
var nest = require('depnest')
var when = require('mutant/when')

exports.needs = nest({
  'sheet.display': 'first',
  'message.html.render': 'first',
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first',
  'emoji.sync.url': 'first'
})

exports.gives = nest('message.sheet.preview')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n

  return nest('message.sheet.preview', function (msg, cb) {
    api.sheet.display(function (close) {
      var isPrivate = msg.value.private
      var isRoot = !msg.value.content.root
      var recps = (msg.value.content.recps || []).filter(id => id !== msg.value.author)

      // handle too many private recipients
      if (isPrivate && recps.length > 7) {
        return {
          content: [
            h('h2', ['Too many recipients']),
            h('div.info', [
              h('p', [
                'Private messages can only be addressed to up to 7 people. ',
                'Your message has ' + recps.length + ' recipients. '
              ]),
              h('p', ['Please go back and remove some of the recipients.'])
            ])
          ],
          classList: ['-private'],
          footer: [h('button -cancel', { 'ev-click': cancel }, i18n('Cancel'))]
        }
      }
      return {
        content: [
          api.message.html.render(msg)
        ],
        classList: [
          when(isPrivate, '-private', '-public')
        ],
        footer: [
          when(isPrivate,
            h('img', {src: api.emoji.sync.url('closed_lock_with_key')}),
            h('img', {src: api.emoji.sync.url('globe_with_meridians')})
          ),
          when(isPrivate,
            h('div.info -private', [
              recps.length ? when(isRoot,
                plural('Only visible to you and %s people that have been mentioned', recps.length),
                plural('Only visible to you and %s other thread participants', recps.length)
              ) : i18n('This message will only be visible to you')
            ]),
            h('div.info -public', [
              when(msg.publicallyEditable,
                i18n('This message will be public and can be edited by anyone'),
                i18n('This message will be public and cannot be edited or deleted')
              )
            ])
          ),
          h('button -save', { 'ev-click': publish }, i18n('Confirm')),
          h('button -cancel', { 'ev-click': cancel }, i18n('Cancel'))
        ]
      }

      function publish () {
        close()
        cb(null, true)
      }

      function cancel () {
        close()
        cb(null, false)
      }
    })
    return true
  })
}
