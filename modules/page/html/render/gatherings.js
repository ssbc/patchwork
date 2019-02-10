var { h } = require('mutant')
var nest = require('depnest')
var Push = require('pull-pushable')

exports.needs = nest({
  'feed.html.rollup': 'first',
  'sbot.pull.resumeStream': 'first',
  'sbot.pull.stream': 'first',
  'gathering.sheet.edit': 'first',
  'keys.sync.id': 'first',
  'contact.obs.following': 'first',
  'intl.sync.i18n': 'first',
  'sqldb.sync.cursorQuery': 'first',
  'sqldb.async.gatherings.roots': 'first',
  'sqldb.async.publicRoots': 'first'
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

    var getStream_ = api.sbot.pull.resumeStream((sbot, opts) => {
      return sbot.patchwork.gatherings.roots(opts)
    }, { limit: 40, reverse: true })

    var getStream = api.sqldb.sync.cursorQuery(api.sqldb.async.gatherings.roots, { limit: 40 })

    return api.feed.html.rollup(getStream, {
      prepend
      // updateStream: Push() // TODO: not using live stream yet
      // updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.gatherings.latest())
    })
  })

  function createGathering () {
    api.gathering.sheet.edit()
  }
}
