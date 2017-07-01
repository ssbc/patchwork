var nest = require('depnest')
var { h } = require('mutant')

exports.needs = nest({
  'feed.pull.public': 'first',
  'message.html.compose': 'first',
  'message.async.publish': 'first',
  'feed.html.rollup': 'first'
})

exports.gives = nest({
  'page.html.render': true
})

exports.create = function (api) {
  return nest('page.html.render', page)

  function page (path) {
    if (path !== '/all') return // "/" is a sigil for "page"

    var prepend = [
      h('PageHeading', [
        h('h1', [
          'All Posts from Your ',
          h('strong', 'Extended Network')
        ])
      ]),
      api.message.html.compose({ meta: { type: 'post' }, placeholder: 'Write a public message' })
    ]

    var feedView = api.feed.html.rollup(api.feed.pull.public, {
      bumpFilter: (msg) => {
        return msg.value.content && typeof msg.value.content === 'object'
      },
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
