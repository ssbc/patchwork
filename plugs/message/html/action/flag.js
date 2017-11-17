var { h, computed, when, Set } = require('mutant')
var nest = require('depnest')

// TODO move somewhere better
var FLAGS = {
  dead: 'Dead Account / Lost Keys',
  spam: 'Spammer',
  abuse: 'Abusive behavior'
}

exports.needs = nest({
  'keys.sync.id': 'first',
  'message.obs.flags': 'first',
  'sbot.async.publish': 'first',
  'sheet.display': 'first'
})

exports.gives = nest('message.html.action')

exports.create = (api) => {
  return nest('message.html.action', function flag (msg) {
    var id = api.keys.sync.id()
    var flagged = computed([api.message.obs.flags(msg.key), id], doesFlag)
    return when(flagged,
      h('a.unflag', {
        href: '#',
        'ev-click': () => publishFlag(msg, null)
      }, 'Unflag'),
      h('a.flag', {
        href: '#',
        'ev-click': () => inputFlag(msg)
      }, 'Flag')
    )
  })

  function inputFlag (msg) {
    // open sheet to ask for reason
    api.sheet.display(function (done) {
      const flagObs = Set()
      const content = (
        h('div', [
          Object.keys(FLAGS).map(function (flagId) {
            const flagDescription = FLAGS[flagId]
            const fieldId = `flag-${msg.key}-${flagId}`
            return (
              h('div', [
                h('input', {
                  name: 'flag',
                  id: fieldId,
                  type: 'checkbox',
                  value: flagId,
                  'ev-change': (ev) => {
                    const { checked } = ev.target
                    if (checked) flagObs.add(flagId)
                    else flagObs.delete(flagId)
                  }
                }),
                h('label', {
                  for: fieldId,
                }, [
                  flagDescription
                ])
              ])
            )
          })
        ])
      )
      const footer = (
        h('button', {
          'ev-click': () => {
            publishFlag(msg, flagObs())
            done()
          }
        }, [
          'flag'
        ])
      )
      return { content, footer }
    })
  }

  function publishFlag (msg, flag) {
    var content = {
      type: 'flag',
      channel: msg.value.content.channel,
      link: msg.key,
      flag
    }
    if (msg.value.content.recps) {
      content.recps = msg.value.content.recps.map(function (e) {
        return e && typeof e !== 'string' ? e.link : e
      })
      content.private = true
    }
    api.sbot.async.publish(content)
  }
}

function doesFlag (flags, userId) {
  return Object.keys(flags).includes(userId)
}
