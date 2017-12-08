var nest = require('depnest')
var ref = require('ssb-ref')

exports.needs = nest({
  'feed.html.rollup': 'first',
  'feed.pull.private': 'first',
  'message.html.compose': 'first',
  'keys.sync.id': 'first',
  'intl.sync.i18n': 'first',
  'about.obs.name': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/private') return

    const i18n = api.intl.sync.i18n
    var id = api.keys.sync.id()
    var compose = api.message.html.compose({
      meta: {type: 'post'},
      isPrivate: true,
      prepublish: function (msg) {
        msg.recps = [id]

        msg.mentions.forEach(mention => {
          mention = typeof mention === 'string' ? mention : mention.link
          if (ref.isFeed(mention) && !msg.recps.includes(mention)) {
            msg.recps.push(mention)
          }
        })

        return msg
      },
      placeholder: i18n('Write a private message')
    })

    var view = api.feed.html.rollup(api.feed.pull.private, {
      prepend: [compose],
      bumpFilter: (msg) => msg.value.content.type !== 'vote'
    })

    view.setAnchor = function (data) {
      if (data && data.compose && data.compose.to) {
        var name = api.about.obs.name(data.compose.to)
        compose.setText(`[@${name()}](${data.compose.to})\n\n`, true)
        window.requestAnimationFrame(() => {
          compose.focus()
        })
      }
    }

    return view
  })
}
