var nest = require('depnest')
var extend = require('xtend')
var Pickr = require('flatpickr')
var spacetime = require('spacetime')

var { Value, h, computed, when } = require('mutant')

exports.gives = nest('gathering.sheet.edit')

exports.needs = nest({
  'sheet.display': 'first',
  'message.sheet.preview': 'first',
  'keys.sync.id': 'first',
  'sbot.async.publish': 'first',
  'about.async.latestValues': 'first',
  'blob.html.input': 'first',
  'blob.sync.url': 'first',
  'intl.sync.i18n': 'first'
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('gathering.sheet.edit', function (id) {
    getCurrentValues(id, (err, currentValues) => {
      if (err) {
        return showDialog({
          type: 'info',
          title: i18n('Update Gathering'),
          buttons: [i18n('OK')],
          message: i18n('Cannot load gathering'),
          detail: err.stack
        })
      }

      api.sheet.display(close => {
        var publishing = Value(false)

        var chosen = {
          title: Value(currentValues.title),
          startDateTime: Value(currentValues.startDateTime),
          image: Value(currentValues.image),
          description: Value(currentValues.description)
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
            }, [id ? i18n('Edit Gathering') : i18n('Create Gathering')]),
            h('GatheringEditor', [
              h('input.title', {
                placeholder: i18n('Choose a title'),
                hooks: [ValueHook(chosen.title), FocusHook()]
              }),
              h('input.date', {
                placeholder: i18n('Choose date and time'),
                hooks: [
                  PickrHook(chosen.startDateTime)
                ]
              }),
              h('ImageInput .banner', {
                style: { 'background-image': computed(imageUrl, x => `url(${x})`) }
              }, [
                h('span', ['🖼 ', i18n('Choose Banner Image...')]),
                api.blob.html.input((err, file) => {
                  if (err) return
                  chosen.image.set(file)
                }, {
                  accept: 'image/*'
                })
              ]),
              h('textarea.description', {
                placeholder: i18n('Describe the gathering (if you want)'),
                hooks: [ValueHook(chosen.description), api.suggest.hook({ participants })]
              })
            ])
          ]),
          footer: [
            h('button -save', {
              'ev-click': save,
              'disabled': publishing
            }, when(publishing, i18n('Publishing...'), i18n('Preview & Publish'))),
            h('button -cancel', {
              'ev-click': close
            }, i18n('Cancel'))
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

          if (!compareImage(chosen.image(), currentValues.image)) update.image = chosen.image()
          if (!compareTime(chosen.startDateTime(), currentValues.startDateTime)) update.startDateTime = chosen.startDateTime()
          if (chosen.title() !== currentValues.title) update.title = chosen.title() || i18n('Untitled Gathering')
          if (chosen.description() !== currentValues.description) update.description = chosen.description()

          if (Object.keys(update).length) {
            // gatherings consist of multiple messages (maybe none of them exist yet), so we need to
            // construct the preview dialog manually, and override the about values
            api.message.sheet.preview({
              key: id,
              previewAbout: update,
              publiclyEditable: true,
              value: {
                author: api.keys.sync.id(),
                content: {
                  type: 'gathering'
                }
              }
            }, (err, confirmed) => {
              if (err) throw err
              if (confirmed) {
                publish(update)
              }
            })
          } else {
            showDialog({
              type: 'info',
              title: i18n('Update Gathering'),
              buttons: [i18n('OK')],
              message: i18n('Nothing to publish'),
              detail: i18n('You have not made any changes.')
            })
            close()
          }
        }

        function publish (update) {
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
                  title: i18n('Error'),
                  buttons: ['OK'],
                  message: i18n('An error occurred while attempting to publish gathering.'),
                  detail: err.message
                })
              } else {
                close()
              }
            })
          })
        }
      })
    })
  })

  function getCurrentValues (id, cb) {
    if (id) {
      api.about.async.latestValues(id, ['title', 'startDateTime', 'image', 'description'], cb)
    } else {
      cb(null, {})
    }
  }
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
