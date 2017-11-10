var { h, computed, when } = require('mutant')
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
        'ev-click': () => publishFlag(msg, false)
      }, 'Unflag'),
      h('a.flag', {
        href: '#',
        'ev-click': () => inputFlag(msg, true)
      }, 'Flag')
    )
  })

  function inputFlag (msg) {
    // open sheet to ask for reason
    api.sheet.display(function (done) {
      const content = (
        h('div', [
          Object.keys(FLAGS).map(function (flagId) {
            const flagDescription = FLAGS[flagId]
            const fieldId = `${msg.id}-${flagId}`
            return (
              h('div', [
                h('input', {
                  name: 'flags',
                  id: fieldId,
                  type: 'checkbox',
                  value: flagId
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
            // TODO get flags from inputs
            publishFlag()
            done()
          }
        }, [
          'flag'
        ])
      )
      return { content, footer }
    })
  }

  function publishFlag (msg, status = true) {
    // TODO
    console.log('publish flag')
    return
    var flag = status ? {
      type: 'vote',
      channel: msg.value.content.channel,
      vote: { link: msg.key, value: -1, expression: 'Flag' }
    } : {
      type: 'vote',
      channel: msg.value.content.channel,
      vote: { link: msg.key, value: 0, expression: 'Unflag' }
    }
    if (msg.value.content.recps) {
      flag.recps = msg.value.content.recps.map(function (e) {
        return e && typeof e !== 'string' ? e.link : e
      })
      flag.private = true
    }
    api.sbot.async.publish(flag)
  }
}

function doesFlag (flags, userId) {
  return flags.includes(userId)
}
