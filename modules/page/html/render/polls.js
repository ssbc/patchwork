var { h, Value } = require('mutant')

// TODO: I'd rather this came from scuttle-poll but inject means I get an obs called isPoll and it's a bit meh
var {isPoll, isPosition} = require('ssb-poll-schema')
var nest = require('depnest')
var ScuttlePoll = require('scuttle-poll')

exports.needs = nest({
  'feed.pull.type': 'first',
  'feed.html.rollup': 'first',
  // 'feed.pull.public': 'first',
  'poll.sheet.edit': 'first',
  'keys.sync.id': 'first',
  // 'contact.obs.following': 'first',
  'sbot.pull.stream': 'first',
  'sbot.obs.connection': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n

  var connection = Value({})
  var scuttlePoll = ScuttlePoll(connection)

  return nest('page.html.render', function channel (path) {
    if (path !== '/polls') return

    api.sbot.obs.connection(connection.set)

    var id = api.keys.sync.id()

    var prepend = [
      h('PageHeading', [
        h('h1', [h('strong', i18n('Polls'))]),
        h('div.meta', [
          h('button -add', {
            'ev-click': createPoll
          }, i18n('+ Add Poll'))
        ])
      ])
    ]

    // TODO replace with streams from ssb-query when new version is merged
    // will enable streaming by publish time
    return api.feed.html.rollup(api.feed.pull.type('poll'), {
      prepend,
      rootFilter: scuttlePoll.poll.sync.isPoll,
      bumpFilter: msg => {
        if (isPoll(msg)) return true
        if (isPosition(msg)) return 'participated'
      },
      resultFilter: (msg) => true, // TODO: ??
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.latest({ids: [id]}))
    })
  })

  function createPoll () {
    api.poll.sheet.edit()
  }
}
