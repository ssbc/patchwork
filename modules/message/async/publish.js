var h = require('mutant/h')
var nest = require('depnest')
var i18n = require('i18n')

var appRoot = require('app-root-path')
var i18n = require(appRoot + '/lib/i18n').i18n

exports.needs = nest({
  'sheet.display': 'first',
  'message.html.render': 'first',
  'sbot.async.publish': 'first',
  'keys.sync.id': 'first'
})

exports.gives = nest('message.async.publish')

exports.create = function (api) {
  return nest('message.async.publish', function (content, cb) {
    api.sheet.display(function (close) {
      return {
        content: [
          api.message.html.render({value: {
            content,
            private: !!content.recps,
            author: api.keys.sync.id()
          }})
        ],
        footer: [
          h('button -save', { 'ev-click': publish }, i18n.__('Confirm')),
          h('button -cancel', { 'ev-click': cancel }, i18n.__('Cancel'))
        ]
      }

      function publish () {
        close()
        api.sbot.async.publish(content, cb)
      }

      function cancel () {
        close()
        cb && cb(null, false)
      }
    })
    return true
  })
}
