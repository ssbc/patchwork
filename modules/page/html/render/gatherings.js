var { h } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'feed.pull.type': 'first',
  'feed.html.rollup': 'first',
  'feed.pull.public': 'first',
  'gathering.sheet.edit': 'first',
  'keys.sync.id': 'first',
  'contact.obs.following': 'first',
  'sbot.pull.stream': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/gatherings') return

    var id = api.keys.sync.id()
    var following = api.contact.obs.following(id)

    var prepend = [
      h('PageHeading', [
        h('h1', [h('strong', 'Gatherings'), ' from your extended network']),
        h('div.meta', [
          h('button -add', {
            'ev-click': createGathering
          }, '+ Add Gathering')
        ])
      ])
    ]

    return api.feed.html.rollup(api.feed.pull.type('gathering'), {
      prepend,
      bumpFilter: function (msg) {
        if (msg.value && msg.value.content && typeof msg.value.content === 'object') {
          var author = msg.value.author
          return id === author || following().has(author)
        }
      },
      rootFilter: (msg) => msg.value.content.type === 'gathering',
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.latest({ids: [id]}))
    })
  })

  function createGathering () {
    api.gathering.sheet.edit()
  }
}
