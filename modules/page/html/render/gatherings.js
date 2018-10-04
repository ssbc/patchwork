var { h } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'feed.pull.type': 'first',
  'feed.html.rollup': 'first',
  'sbot.pull.resumeStream': 'first',
  'gathering.sheet.edit': 'first',
  'keys.sync.id': 'first',
  'contact.obs.following': 'first',
  'sbot.pull.stream': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', function channel (path) {
    if (path !== '/gatherings') return

    var prepend = [
      h('PageHeading', [
        h('h1', [h('strong', i18n('Gatherings'))]),
        h('div.meta', [
          h('button -add', {
            'ev-click': createGathering
          }, i18n('+ Add Gathering'))
        ])
      ])
    ]

    var getStream = api.sbot.pull.resumeStream((sbot, opts) => {
      return sbot.patchwork.gatherings.roots(opts)
    }, {limit: 20, reverse: true})

    return api.feed.html.rollup(getStream, {
      prepend
    })
  })

  function createGathering () {
    api.gathering.sheet.edit()
  }
}
