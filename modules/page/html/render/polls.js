var { h, Value } = require('mutant')
var nest = require('depnest')
var Poll = require('scuttle-poll')

exports.needs = nest({
  'feed.pull.type': 'first',
  'feed.html.rollup': 'first',
  'feed.pull.public': 'first',
  'poll.sheet.edit': 'first',
  'keys.sync.id': 'first',
  'contact.obs.following': 'first',
  'sbot.pull.stream': 'first',
  'sbot.obs.connection': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('page.html.render')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n

  var connection = Value({})
  var poll = Poll(connection)

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

    return api.feed.html.rollup(api.feed.pull.type('poll'), {
      prepend,
      rootFilter: poll.poll.sync.isPoll,
      bumpFilter: msg => poll.poll.sync.isPoll(msg) || poll.position.sync.isPosition(msg),
      resultFilter: (msg) => true,
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.latest({ids: [id]}))
    })
  })

  function createPoll () {
    api.poll.sheet.edit()
  }
}

function followsAuthor (following, yourId, msg) {
  var author = msg.value.author
  return yourId === author || following().includes(author)
}

function followingIsAttending (following, msg) {
  if (Array.isArray(msg.replies)) {
    return msg.replies.some((reply) => isAttendee(reply) && following().includes(reply.value.author))
  }
}

function isAttendee (msg) {
  var content = msg.value && msg.value.content
  return (content && content.type === 'about' && content.attendee && !content.attendee.remove)
}

function isGathering (msg) {
  return (msg.value && msg.value.content && msg.value.content.type === 'gathering')
}
