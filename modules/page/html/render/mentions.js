var { h, when } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'feed.html.rollup': 'first',
  'keys.sync.id': 'first',
  'feed.pull.mentions': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function mentions (path) {
    if (path !== '/mentions') return
    var id = api.keys.sync.id()
    return api.feed.html.rollup(api.feed.pull.mentions(id), {
      bumpFilter: mentionFilter,
      displayFilter: mentionFilter
    })

    // scoped
    function mentionFilter (msg) {
      if (Array.isArray(msg.value.content.mentions)) {
        if (msg.value.content.mentions.some(mention => {
          return mention && mention.link === id
        })) {
          return 'mention'
        }
      }
    }
  })
}
