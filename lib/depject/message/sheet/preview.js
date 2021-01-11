const h = require('mutant/h')
const nest = require('depnest')
const when = require('mutant/when')
const emoji = require('node-emoji')

exports.needs = nest({
  'sheet.display': 'first',
  'message.html.render': 'first',
  'intl.sync.i18n': 'first',
  'intl.sync.i18n_n': 'first'
})

exports.gives = nest('message.sheet.preview')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  const plural = api.intl.sync.i18n_n

  return nest('message.sheet.preview', function (msg, cb) {
    api.sheet.display(function (close) {
      const isPrivate = msg.value.private
      const isRoot = !msg.value.content.root
      const exists = !!msg.key
      const recps = (msg.value.content.recps || []).filter(id => id !== msg.value.author)

      // handle too many private recipients
      if (isPrivate && recps.length >= 7) {
        return {
          content: [
            h('h2', [i18n('Too many recipients')]),
            h('div.info', [
              h('p', [
                i18n('Private messages can only be addressed to up to 7 people. '),
                plural('Your message has %s recipients, including yourself', recps.length)
              ]),
              h('p', [i18n('Please go back and remove some of the recipients.')])
            ])
          ],
          classList: ['-private'],
          footer: [h('button -cancel', { 'ev-click': cancel }, i18n('Close'))]
        }
      }

      const messageElement = api.message.html.render(msg)

      // allow inspecting of raw message that is about to be sent
      messageElement.msg = msg

      const cancelButton = h('button -cancel', { 'ev-click': cancel }, i18n('Cancel'))
      return {
        content: [
          messageElement
        ],
        classList: [
          when(isPrivate, '-private', '-public')
        ],
        footer: [
          when(isPrivate,
            h('span.Emoji', emoji.get('closed_lock_with_key')),
            h('span.Emoji', emoji.get('globe_with_meridians'))
          ),
          when(isPrivate,
            h('div.info -private', [
              recps.length
                ? when(!exists && isRoot,
                    plural('Only visible to you and %s people that have been mentioned', recps.length),
                    plural('Only visible to you and %s other thread participants', recps.length)
                  )
                : i18n('This message will only be visible to you')
            ]),
            h('div.info -public', [
              when(msg.publiclyEditable,
                i18n('This message will be public and can be edited by anyone'),
                i18n('This message will be public and cannot be edited or deleted')
              )
            ])
          ),
          h('button -save', { 'ev-click': publish }, i18n('Confirm')),
          cancelButton
        ],
        onMount: () => {
          cancelButton.focus()
        },
        attributes: {
          'ev-keydown': ev => {
            if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
              publish()
              ev.preventDefault()
            } else if (ev.key === 'Escape') {
              cancel()
              ev.preventDefault()
            }
          }
        }
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
