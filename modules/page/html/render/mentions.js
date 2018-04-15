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
      compactFilter: (msg) => !mentionFilter(msg), // compact context messages
      bumpFilter: mentionFilter,
      displayFilter: mentionFilter
    })

    // scoped
    function mentionFilter (msg) {
      if (msg.value.author !== id) {
        if (Array.isArray(msg.value.content.mentions) && msg.value.content.mentions.some(mention => {
          return mention && mention.link === id
        })) {
          return 'mention'
        } else if (msg.value.content.type === 'contact' && msg.value.content.following === true) {
          return true
        } else if (msg.value.content.type === 'about') {
          return true
        }
      }
    }
  })
}
