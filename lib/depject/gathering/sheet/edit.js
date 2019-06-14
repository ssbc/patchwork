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
  'sbot.async.get': 'first',
  'about.async.latestValues': 'first',
  'blob.html.input': 'first',
  'blob.sync.url': 'first',
  'intl.sync.i18n': 'first',
  'suggest.hook': 'first'
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('gathering.sheet.edit', function (id) {
    getCurrentValues(id, (err, msg) => {
      if (err) {
        return showDialog({
          type: 'info',
          title: i18n('Update Gathering'),
          buttons: [i18n('OK')],
          message: i18n('Cannot load gathering'),
          detail: err.stack
        })
      }

      // use private gathering recps for default profile suggestions
      var participants = msg.value && msg.value.content && msg.value.content.recps

      api.sheet.display(close => {
        var publishing = Value(false)

        var chosen = {
          title: Value(msg.gathering.title),
          startDateTime: Value(msg.gathering.startDateTime),
          image: Value(msg.gathering.image),
          description: Value(msg.gathering.description)
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

          if (!compareImage(chosen.image(), msg.gathering.image)) update.image = chosen.image()
          if (!compareTime(chosen.startDateTime(), msg.gathering.startDateTime)) update.startDateTime = chosen.startDateTime()
          if (chosen.title() !== msg.gathering.title) update.title = chosen.title() || i18n('Untitled Gathering')
          if (chosen.description() !== msg.gathering.description) update.description = chosen.description()

          if (Object.keys(update).length) {
            // gatherings consist of multiple messages (maybe none of them exist yet), so we need to
            // construct the preview dialog manually, and override the about values
            api.message.sheet.preview({
              key: id,
              previewAbout: update,
              publiclyEditable: true,
              value: {
                author: api.keys.sync.id(),
                private: true,
                content: {
                  type: 'gathering',
                  recps: participants
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
            var content = extend({
              type: 'about',
              about: id
            }, update)

            // keep private gatherings private!
            if (msg.value && msg.value.content && msg.value.content.recps) {
              content.recps = msg.value.content.recps
            }

            api.sbot.async.publish(content, (err) => {
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
      api.sbot.async.get({ id, private: true }, (err, value) => {
        if (err) return cb(err)
        if (value.content.type === 'gathering') {
          api.about.async.latestValues(id, ['title', 'startDateTime', 'image', 'description'], (err, gathering) => {
            if (err) return cb(err)
            cb(null, { key: id, value, gathering })
          })
        } else {
          cb(new Error('Message must be of type "gathering"'))
        }
      })
    } else {
      cb(null, { gathering: {} })
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
    var picker = Pickr(element, {
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
