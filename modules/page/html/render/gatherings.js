var { h } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'feed.pull.type': 'first',
  'feed.html.rollup': 'first',
  'gathering.sheet.edit': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  return nest('page.html.render', function channel (path) {
    if (path !== '/gatherings') return

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

    return api.feed.html.rollup(api.feed.pull.type('gathering'), { prepend, windowSize: 100 })
  })

  function createGathering () {
    api.gathering.sheet.edit()
  }
}
