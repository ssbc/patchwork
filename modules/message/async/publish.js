var nest = require('depnest')

exports.needs = nest({
  'message.sheet.preview': 'first',
  'sbot.async.publish': 'first',
  'keys.sync.id': 'first'
})

exports.gives = nest('message.async.publish')

exports.create = function (api) {
  return nest('message.async.publish', function (content, cb) {
    api.message.sheet.preview({value: {
      content,
      private: !!content.recps,
      author: api.keys.sync.id()
    }}, (err, confirmed) => {
      if (err) throw err
      if (confirmed) {
        api.sbot.async.publish(content, cb)
      } else {
        cb && cb(null, false)
      }
    })
    return true
  })
}
