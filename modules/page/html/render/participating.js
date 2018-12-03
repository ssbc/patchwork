var nest = require('depnest')
var { h } = require('mutant')

exports.needs = nest({
  'sbot.pull.resumeStream': 'first',
  'sbot.pull.stream': 'first',
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
    if (path !== '/participating') return // "/" is a sigil for "page"

    var prepend = [
      h('PageHeading', [
        h('h1', [
          i18n('Participating')
        ])
      ]),
      api.message.html.compose({ meta: { type: 'post' }, placeholder: i18n('Write a public message') })
    ]

    var getStream = api.sbot.pull.resumeStream((sbot, opts) => {
      return sbot.patchwork.participatingFeed.roots(opts)
    }, { limit: 10, reverse: true })

    var feedView = api.feed.html.rollup(getStream, {
      prepend,
      searchSpinner: true,
      groupSummaries: false,
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.participatingFeed.latest())
    })

    var result = h('div.SplitView', [
      h('div.main', feedView)
    ])

    result.pendingUpdates = feedView.pendingUpdates
    result.reload = feedView.reload

    return result
  }
}
