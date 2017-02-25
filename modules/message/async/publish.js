var h = require('mutant/h')
var nest = require('depnest')

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
          h('button -save', { 'ev-click': publish }, 'Confirm'),
          h('button -cancel', { 'ev-click': cancel }, 'Cancel')
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
