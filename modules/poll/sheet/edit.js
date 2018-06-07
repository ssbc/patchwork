var nest = require('depnest')
var extend = require('xtend')
var Pickr = require('flatpickr')
var spacetime = require('spacetime')

var {Value, resolve, h, computed, when, map, Struct, Array: MutantArray} = require('mutant')

var Poll = require('scuttle-poll')

exports.gives = nest('poll.sheet.edit')

exports.needs = nest({
  'sheet.display': 'first',
  'keys.sync.id': 'first',
  'sbot.async.publish': 'first',
  'sbot.obs.connection': 'first',
  'about.obs.latestValue': 'first',
  'blob.html.input': 'first',
  'blob.sync.url': 'first',
  'intl.sync.i18n': 'first'
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('poll.sheet.edit', function (id) {
    var scuttlePoll = Poll(api.sbot.obs.connection)
    api.sheet.display(close => {
      const poll = Struct({
        title: undefined,
        body: undefined,
        choices: MutantArray([Value(), Value(), Value()]),
        closesAt: undefined
      })

      var picker
      const timeInput = h('input', {
        'ev-change': () => {
          poll.closesAt.set(picker.input.value)
        }
      })

      const page = h('PollNew -chooseOne', [
        h('h2', {
          style: {
            'font-weight': 'normal'
          }
        }, [i18n('Create new Choose-one poll')]),
        h('PollEditor', [
          h('input.title', { 'ev-input': ev => poll.title.set(ev.target.value), placeholder: i18n('Choose a title') }, poll.title),
          h('textarea.description', { 'ev-input': ev => poll.body.set(ev.target.value), placeholder: i18n('Describe the poll if you want') }, poll.body),

          h('div.field -choices', [
            h('div.inputs', [
              map(poll.choices, (choice, index) => {
                return h('input', { 'ev-input': ev => choice.set(ev.target.value), placeholder: i18n('Choice') }, choice)
              }),
              h('button', { 'ev-click': () => poll.choices.push(Value()) }, i18n('+ Add more choices'))
            ])
          ]),
          h('input.date', {
            placeholder: i18n('Choose date and time'),
            hooks: [
              PickrHook(poll.closesAt)
            ]
          })
        ])
      ])

      const Pickr = require('flatpickr')
      picker = new Pickr(timeInput, {
        enableTime: true,
        altInput: true,
        altFormat: 'F j, Y h:i K',
        dateFormat: 'Z'
      })

      page.cancel = cancel // made available for manual garbage collection of flatpicker
      return {
        content: h('div', {
          style: {
            padding: '20px',
            'text-align': 'center'
          }
        }, [page]),
        footer: [
          h('button -save', {
            // TODO: publish it
            'ev-click': publish
          }, i18n('Publish')),
          h('button -cancel', {
            'ev-click': close
          }, i18n('Cancel'))
        ]
      }

      function cancel () {
        picker && picker.destroy && picker.destroy()
        close && close()
      }

      function publish () {
        const content = resolveInput(poll)
        scuttlePoll.poll.async.publishChooseOne(content, (err, success) => {
          if (err) return console.log(err) // put warnings on form
          close(success)
        })
      }
    })
  })
}

function compareTime (a, b) {
  if (!a && !b) {
    return true
  } else if (!a || !b) {
    return false
  } else {
    return a.epoch === b.epoch
  }
}

function compareImage (a, b) {
  a = isObject(a) ? a.link : a
  b = isObject(b) ? b.link : b
  return a === b
}

function isObject (value) {
  return value && typeof value === 'object'
}

function FocusHook () {
  return function (element) {
    setTimeout(() => {
      element.focus()
      element.select()
    }, 5)
  }
}

function ValueHook (obs) {
  return function (element) {
    element.value = obs()
    element.oninput = function () {
      obs.set(element.value.trim())
    }
  }
}

function showDialog (opts) {
  var electron = require('electron')
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}

function PickrHook (obs) {
  return function (element) {
    var picker = new Pickr(element, {
      enableTime: true,
      altInput: true,
      dateFormat: 'U',
      onChange: function (dates) {
        obs.set(spacetime(parseInt(element.value, 10) * 1000))
      }
    })

    var value = obs()
    if (value) {
      picker.setDate(value.epoch)
    }
    return () => picker.destroy()
  }
}
function resolveInput (struct) {
  // prunes all empty fields
  // returns plain object
  var result = resolve(struct)

  Object.keys(result)
    .forEach(k => {
      const val = result[k]
      if (!val) delete result[k]

      if (Array.isArray(val)) result[k] = val.filter(Boolean)
    })
  return result
}
