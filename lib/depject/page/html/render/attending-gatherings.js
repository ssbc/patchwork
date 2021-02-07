const { h, send } = require('mutant')
const nest = require('depnest')

exports.needs = nest({
  'feed.html.rollup': 'first',
  'sbot.pull.resumeStream': 'first',
  'app.navigate': 'first',
  'sbot.pull.stream': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', function channel (path) {
    if (path !== '/attending-gatherings') return
    const prepend = [
      h('PageHeading', [
        h('h1', [h('strong', i18n('Attending Gatherings'))]),
        h('div.meta', [
          h('button', { 'ev-click': send(api.app.navigate, '/gatherings') }, 'View All Gatherings')
        ])
      ])
    ]

    const getStream = api.sbot.pull.resumeStream((sbot, opts) => {
      return sbot.patchwork.gatherings.roots(opts)
    }, { limit: 40, reverse: true, onlyAttending: true })

    return api.feed.html.rollup(getStream, {
      prepend,
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.gatherings.latestAttending())
    })
  })
}
