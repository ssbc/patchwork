var nest = require('depnest')
var { h } = require('mutant')
var extend = require('xtend')
var pull = require('pull-stream')

exports.needs = nest({
  'sbot.pull.feed': 'first',
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

    var feedView = api.feed.html.rollup(getFeed, {
      prepend,
      windowSize: 1000
    })

    var result = h('div.SplitView', [
      h('div.main', feedView)
    ])

    result.pendingUpdates = feedView.pendingUpdates
    result.reload = feedView.reload

    return result

    function getFeed (opts) {
      if (opts.lt) {
        opts = extend(opts, {lt: parseInt(opts.lt, 10)})
      }

      return pull(
        api.sbot.pull.feed(opts),
        pull.map((msg) => {
          if (msg.sync) return msg
          return {key: msg.key, value: msg.value, timestamp: msg.value.timestamp}
        })
      )
    }
  }
}
