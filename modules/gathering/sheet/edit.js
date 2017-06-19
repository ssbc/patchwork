var nest = require('depnest')
var extend = require('xtend')
var Pickr = require('flatpickr')
var spacetime = require('spacetime')

var {Value, h, computed, when} = require('mutant')

exports.gives = nest('gathering.sheet.edit')

exports.needs = nest({
  'sheet.display': 'first',
  'keys.sync.id': 'first',
  'sbot.async.publish': 'first',
  'about.obs.latestValue': 'first',
  'blob.html.input': 'first',
  'blob.sync.url': 'first'
})

exports.create = function (api) {
  return nest('gathering.sheet.edit', function (id) {
    api.sheet.display(close => {
      var current = id ? {
        title: api.about.obs.latestValue(id, 'title'),
        startDateTime: api.about.obs.latestValue(id, 'startDateTime'),
        image: api.about.obs.latestValue(id, 'image'),
        description: api.about.obs.latestValue(id, 'description')
      } : {
        title: Value(),
        startDateTime: Value(),
        image: Value(),
        description: Value()
      }

      var publishing = Value(false)

      var chosen = {
        title: Value(current.title()),
        startDateTime: Value(current.startDateTime()),
        image: Value(current.image()),
        description: Value(current.description())
      }

      var imageUrl = computed(chosen.image, (id) => id && api.blob.sync.url(id))

      return {
        content: h('div', {
          style: {
            padding: '20px',
            'text-align': 'center'
          }
        }, [
          h('h2', {
            style: {
              'font-weight': 'normal'
            }
          }, [id ? 'Edit' : 'Create', ' Gathering']),
          h('GatheringEditor', [
            h('input.title', {
              placeholder: 'Choose a title',
              hooks: [ValueHook(chosen.title), FocusHook()]
            }),
            h('input.date', {
              placeholder: 'Choose date and time',
              hooks: [
                PickrHook(chosen.startDateTime)
              ]
            }),
            h('ImageInput .banner', {
              style: { 'background-image': computed(imageUrl, x => `url(${x})`) }
            }, [
              h('span', ['🖼 Choose Banner Image...']),
              api.blob.html.input(file => {
                chosen.image.set(file)
              }, {
                accept: 'image/*'
              })
            ]),
            h('textarea.description', {
              placeholder: 'Describe the gathering (if you want)',
              hooks: [ValueHook(chosen.description)]
            })
          ])
        ]),
        footer: [
          h('button -save', {
            'ev-click': save,
            'disabled': publishing
          }, when(publishing, 'Publishing...', 'Publish')),
          h('button -cancel', {
            'ev-click': close
          }, 'Cancel')
        ]
      }

      function ensureExists (cb) {
        if (!id) {
          api.sbot.async.publish({
            type: 'gathering'
          }, (err, msg) => {
            if (err) return cb(err)
            cb(null, msg.key)
          })
        } else {
          cb(null, id)
        }
      }

      function save () {
        // no confirm
        var update = {}

        if (!compareImage(chosen.image(), current.image())) update.image = chosen.image()
        if (!compareTime(chosen.startDateTime(), current.startDateTime())) update.startDateTime = chosen.startDateTime()
        if (chosen.title() !== current.title()) update.title = chosen.title() || 'Untitled Gathering'
        if (chosen.description() !== current.description()) update.description = chosen.description()

        if (Object.keys(update).length) {
          publishing.set(true)
          ensureExists((err, id) => {
            if (err) throw err
            api.sbot.async.publish(extend({
              type: 'about',
              about: id
            }, update), (err) => {
              if (err) {
                publishing.set(false)
                showDialog({
                  type: 'error',
                  title: 'Error',
                  buttons: ['OK'],
                  message: 'An error occurred while attempting to publish gathering.',
                  detail: err.message
                })
              } else {
                close()
              }
            })
          })
        } else {
          close()
        }
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
