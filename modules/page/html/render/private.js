var nest = require('depnest')
var ref = require('ssb-ref')

exports.needs = nest({
  'feed.html.rollup': 'first',
  'feed.pull.private': 'first',
  'keys.sync.id': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/private') return

    var id = api.keys.sync.id()
    var prepend = [
      // api.message.html.compose({type: 'post'}, {
      //   prepublish: function (msg) {
      //     msg.recps = [id].concat(msg.mentions).filter(function (e) {
      //       return ref.isFeed(typeof e === 'string' ? e : e.link)
      //     })
      //     if (!msg.recps.length) {
      //       throw new Error('cannot make private message without recipients - just mention the user in an at reply in the message you send')
      //     }
      //     return msg
      //   },
      //   placeholder: `Write a private message \n\n\n\nThis can only be read by yourself and people you have @mentioned.`
      // })
    ]

    return api.feed.html.rollup(api.feed.pull.private, { prepend })
  })
}
