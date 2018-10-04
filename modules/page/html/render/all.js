var nest = require('depnest')
var { h } = require('mutant')

exports.needs = nest({
  'sbot.pull.resumeStream': 'first',
  'message.html.compose': 'first',
  'message.async.publish': 'first',
  'feed.html.rollup': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest({
  'page.html.render': true
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', page)

  function page (path) {
    if (path !== '/all') return // "/" is a sigil for "page"

    var prepend = [
      h('PageHeading', [
        h('h1', [
          i18n('All Posts from Your '),
          h('strong', i18n('Extended Network'))
        ])
      ]),
      api.message.html.compose({ meta: { type: 'post' }, placeholder: i18n('Write a public message') })
    ]

    var getStream = api.sbot.pull.resumeStream((sbot, opts) => {
      return sbot.patchwork.networkFeed.roots(opts)
    }, {limit: 40, reverse: true})

    var feedView = api.feed.html.rollup(getStream, {
      prepend
    })

    var result = h('div.SplitView', [
      h('div.main', feedView)
    ])

    result.pendingUpdates = feedView.pendingUpdates
    result.reload = feedView.reload

    return result
  }
}
