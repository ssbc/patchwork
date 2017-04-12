var nest = require('depnest')
var ref = require('ssb-ref')

exports.needs = nest({
  'feed.html.rollup': 'first',
  'feed.pull.private': 'first',
  'message.html.compose': 'first',
  'keys.sync.id': 'first',
  'intl.sync.format': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  var format = api.intl.sync.format;
  return nest('page.html.render', function channel (path) {
    if (path !== '/private') return

    var id = api.keys.sync.id()
    var prepend = [
      api.message.html.compose({
        meta: {type: 'post'},
        prepublish: function (msg) {
          msg.recps = [id].concat(msg.mentions).filter(function (e) {
            return ref.isFeed(typeof e === 'string' ? e : e.link)
          })
          return msg
        },
        placeholder: format('writePrivateMessage')
      })
    ]

    return api.feed.html.rollup(api.feed.pull.private, { prepend, windowSize: 50 })
  })
}
