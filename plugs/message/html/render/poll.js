var { h, resolve, computed, when, map, send, Value, Struct } = require('mutant')
var nest = require('depnest')

// TODO: should this be provided by scuttle-poll? I _think_ so.
var { parseChooseOnePoll, isPoll, isPosition } = require('ssb-poll-schema')
var Poll = require('scuttle-poll')

exports.needs = nest({
  'message.html.markdown': 'first',
  'message.html.layout': 'first',
  'message.html.decorate': 'reduce',
  'message.async.publish': 'first',
  'keys.sync.id': 'first',
  'about.html.image': 'first',
  'about.obs.latestValue': 'first',
  'about.obs.groupedValues': 'first',
  'about.obs.valueFrom': 'first',
  'about.obs.name': 'first',
  'contact.obs.following': 'first',
  'blob.sync.url': 'first',
  'poll.sheet.edit': 'first',
  'sbot.obs.connection': 'first'
})

exports.gives = nest('message.html', {
  canRender: true,
  render: true
})

exports.create = function (api) {
  var mdRenderer = markdown
  var avatar = (feed) => {
    return h('a.avatar', {href: `${feed}`}, [
      api.about.html.image(feed)
    ])
  }
  var name = api.about.obs.name
  var timeago = defaultTimeago

  return nest('message.html', {
    canRender: isPoll,
    render: function (msg, opts = {}) {
      if (!isPoll(msg)) return

      // TODO: this runs inject and makes a new scuttlepoll instance for every message. One option is to depject scuttlepoll.
      var scuttlePoll = Poll(api.sbot.obs.connection)

      const { title, body, closesAt: closesAtString, details: {choices} } = parseChooseOnePoll(msg)
      const closesAt = new Date(closesAtString)

      // TODO use parseChooseOnePoll or scuttlePoll
      const pollDoc = Struct({ results: [], positions: [], myPosition: false })

      updatePollDoc()

      function updatePollDoc () {
        scuttlePoll.poll.async.get(msg.key, (err, data) => {
          if (err) return console.error(err)
          pollDoc.set(data)
        })
      }

      return opts.compact
        ? PollCard()
        : PollShowChooseOne()

      function PollCard () {
        if (!isPoll) return
        const { title, body, closesAt: closesAtString } = parseChooseOnePoll(msg)

        const closesAt = new Date(closesAtString)
        const date = closesAt.toDateString()
        const [ _, time, zone ] = closesAt.toTimeString().match(/^(\d+:\d+).*(\(\w+\))$/)

        return h('a', { href: msg.key }, [
          h('PollCard', { className: 'Markdown' }, [
            h('h1', title),
            h('div.body', mdRenderer(body || '')),
            h('div.closesAt', [
              'closes at: ',
              `${time},  ${date} ${zone}`
            ])
          ])
        ])
      }

      function PollShowChooseOne () {
        return h('PollShow -chooseOne', [
          h('section.details', [
            h('h1', [
              h('a', {
                href: msg.key
              }, title)
            ]),
            h('div.body', mdRenderer(body || '')),
            h('div.closesAt', [
              h('div.label', 'Closes at'),
              printClosesAt(closesAt)
            ])
          ]),
          NewPosition({
            choices,
            currentPosition: pollDoc.myPosition,
            onPublish: (success) => {
              // TODO: fix
              // onPositionPublished(success)
              updatePollDoc()
            }
          }),
          Progress({ pollDoc, avatar, timeago, name, mdRenderer })
        ])
      }

      function Progress ({ pollDoc, avatar, timeago, name, mdRenderer }) {
        const forceShow = Value(false)
        const showProgress = computed([pollDoc.myPosition, forceShow], (myPosition, force) => {
          if (force) return true
          return Boolean(myPosition)
        })

        return when(showProgress,
          [
            Results({ pollDoc, avatar }),
            Positions({ pollDoc, avatar, timeago, name, mdRenderer })
          ],
          h('div.sneakpeak', { 'ev-click': ev => forceShow.set(true) },
            'see results'
          )
        )
      }

      function Positions ({ pollDoc, avatar, timeago, name, mdRenderer }) {
        return h('section.PollPositions', [
          h('h2', ['History']),
          h('div.positions', map(pollDoc.positions, position => {
            if (!isPosition(position)) return
            const {author, timestamp} = position.value
            // postion, reason, time, avatar, name
            return h('PollPosition', [
              h('div.left', [
                h('div.avatar', avatar(author)),
                h('div.timestamp', timeago(timestamp))
              ]),
              h('div.right', [
                h('div.summary', [
                  h('div.name', name(author)),
                  '-',
                  h('div.choice', position.choice)
                ]),
                h('div.reason', mdRenderer(position.reason || ''))
              ])
            ])
          }))
        ])
      }

      function Results ({ pollDoc, avatar }) {
        return h('section.PollResults', [
          h('h2', 'Current Results'),
          h('div.choices', map(pollDoc.results, result => {
            const count = computed(result.voters, vs => Object.keys(vs).length)
            return when(count, h('div.choice', [
              h('div.header', [
                result.choice,
                h('span.count', ['(', count, ')'])
              ]),
              h('div.positions', Object.keys(result.voters).map(avatar))
            ]))
          }))
        ])
      }

      function NewPosition ({ choices, currentPosition, onPublish }) {
        const newPosition = Struct({
          choice: Value(),
          reason: Value('')
        })

        const forceShow = Value(false)
        forceShow(console.log)

        const className = computed([pollDoc.myPosition, forceShow], (myPosition, force) => {
          if (force) return '-show'
          if (myPosition === false) return '-hidden'
          return !myPosition ? '-show' : '-hidden'
        })

        return h('section.NewPosition', { className }, [
          h('div.field -choices', [
            h('label', 'Choose One'),
            h('div.inputs', choices.map((choice, index) => {
              var id = `choice-${index}`
              return h('div.choice', {'ev-click': ev => { newPosition.choice.set(index) }}, [
                h('input', { type: 'radio', checked: computed(newPosition.choice, c => c === index), id, name: 'choices' }),
                h('label', { for: id }, choice)
              ])
            })
            )
          ]),
          h('div.field -reason', [
            h('label', 'Reason'),
            h('textarea', { 'ev-input': ev => newPosition.reason.set(ev.target.value) }, newPosition.reason)
          ]),
          h('div.actions', [
            h('button.publish.-primary', { 'ev-click': publish }, 'Publish position')
          ]),
          h('div.changePosition', { 'ev-click': ev => forceShow.set(true) },
            'Change your position'
          )
        ])

        function publish () {
          const content = {
            poll: parseChooseOnePoll(msg),
            choice: resolve(newPosition.choice),
            reason: resolve(newPosition.reason)
          }
          scuttlePoll.position.async.publishChooseOne(content, (err, success) => {
            if (err) return console.log(err) // put warnings on form

            onPublish(success)
            forceShow.set(false)
          })
        }
      }
    }
  })

  function markdown (obs) {
    return computed(obs, (text) => {
      if (typeof text === 'string') return api.message.html.markdown(text)
    })
  }
}

function defaultTimeago (time) {
  return new Date(time).toISOString().substr(0, 10)
}

function printClosesAt (dateTime) {
  const date = dateTime.toDateString()
  const [ _, time, zone ] = dateTime.toTimeString().match(/^(\d+:\d+).*(\(\w+\))$/)
  return `${time}, ${date} ${zone}`
}
