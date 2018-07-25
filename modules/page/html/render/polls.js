var { h, Value, computed, when } = require('mutant')

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

const OPEN = 'open'
const CLOSED = 'closed'
const ALL = 'all'

exports.create = function (api) {
  const i18n = api.intl.sync.i18n

  return nest('page.html.render', function channel (path) {
    if (path !== '/polls') return

    var scuttlePoll = ScuttlePoll(api.sbot.obs.connection)
    var id = api.keys.sync.id()

    // TODO: change back to OPEN
    var mode = Value(ALL)
    var prepend = [
      h('PageHeading', [
        h('h1', [h('strong', i18n('Polls'))]),
        h('div.filter', [ FilterButton(OPEN), FilterButton(CLOSED), FilterButton(ALL) ]),
        h('div.meta', [
          h('button -add', {
            'ev-click': createPoll
          }, i18n('+ Add Poll'))
        ])
      ])
    ]

    const rollupOpts = {
      prepend,
      compactFilter: m => true,
      rootFilter: scuttlePoll.poll.sync.isPoll,
      bumpFilter: msg => {
        if (isPoll(msg)) return true
        if (isPosition(msg)) return 'participated'
      },
      // resultFilter: (msg) => true,
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.latest({ids: [id]})),
      nextStepper: v => v
    }
    // NOTE - scuttlePoll has creates stepped pull-streams for you, let
    // nextStepper: v => v  // stops double-steppering!

    return computed(mode, mode => {
      return api.feed.html.rollup(scuttlePoll.poll.pull[mode], rollupOpts)
    })

    function FilterButton (m) {
      return h('button', {
        'ev-click': () => mode.set(m),
        className: computed(mode, mode => m === mode ? '-filterSelected' : '-filterUnselected')
      }, i18n(m))
    }
  })

  function createPoll () {
    api.poll.sheet.edit()
  }
}
