const { h } = require('mutant')
const nest = require('depnest')

exports.needs = nest({
  'feed.html.rollup': 'first',
  'sbot.pull.resumeStream': 'first',
  'sbot.pull.stream': 'first',
  'gathering.sheet.edit': 'first',
  'keys.sync.id': 'first',
  'contact.obs.following': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('page.html.render', function channel (path) {
    if (path !== '/gatherings') return

    const prepend = [
      h('PageHeading', [
        h('h1', [h('strong', i18n('Gatherings'))]),
        h('div.meta', [
          h('button -add', {
            'ev-click': createGathering
          }, i18n('+ Add Gathering'))
        ])
      ])
    ]

    const getStream = api.sbot.pull.resumeStream((sbot, opts) => {
      return sbot.patchwork.gatherings.roots(opts)
    }, { limit: 40, reverse: true })

    return api.feed.html.rollup(getStream, {
      prepend,
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.gatherings.latest())
    })
  })

  function createGathering () {
    api.gathering.sheet.edit()
  }
}
