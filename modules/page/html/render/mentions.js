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
      windowSize: 20,
      partial: true
    })
  })
}
