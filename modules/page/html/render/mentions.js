var nest = require('depnest')

exports.needs = nest({
  'feed.html.rollup': 'first',
  'keys.sync.id': 'first',
  'sbot.pull.resumeStream': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function mentions (path) {
    if (path !== '/mentions') return

    var getStream = api.sbot.pull.resumeStream((sbot, opts) => {
      return sbot.patchwork.mentionsFeed.roots(opts)
    }, {limit: 40, reverse: true})

    return api.feed.html.rollup(getStream, {
      compactFilter // compact context messages
    })
  })

  function compactFilter (msg) {
    var id = api.keys.sync.id()
    return !(Array.isArray(msg.value.content.mentions) && msg.value.content.mentions.some(mention => {
      return mention && mention.link === id
    }))
  }
}
