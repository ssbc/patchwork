var { h } = require('mutant')
var nest = require('depnest')

exports.needs = nest({
  'feed.pull.type': 'first',
  'feed.html.rollup': 'first',
  'feed.pull.public': 'first',
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

    var id = api.keys.sync.id()
    var following = api.contact.obs.following(id)

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

    return api.feed.html.rollup(api.feed.pull.type('gathering'), {
      prepend,
      rootFilter: (msg) => isGathering(msg),
      bumpFilter: (msg) => {
        if (isGathering(msg)) {
          return true
        } else if (followsAuthor(following, id, msg) && isAttendee(msg)) {
          return 'attending'
        }
      },
      resultFilter: (msg) => followsAuthor(following, id, msg) || followingIsAttending(following, msg),
      updateStream: api.sbot.pull.stream(sbot => sbot.patchwork.latest({ids: [id]}))
    })
  })

  function createGathering () {
    api.gathering.sheet.edit()
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