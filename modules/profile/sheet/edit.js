var nest = require('depnest')
var extend = require('xtend')
var {Value, h, computed, when} = require('mutant')
var fallbackImageUrl = 'data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='

exports.gives = nest('profile.sheet.edit')

exports.needs = nest({
  'sheet.display': 'first',
  'keys.sync.id': 'first',
  'sbot.async.publish': 'first',
  'about.obs': {
    name: 'first',
    description: 'first',
    image: 'first',
    color: 'first'
  },
  'blob.html.input': 'first',
  'blob.sync.url': 'first',
  'intl.sync.i18n': 'first',
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('profile.sheet.edit', function () {
    var id = api.keys.sync.id()
    api.sheet.display(close => {
      var currentName = api.about.obs.name(id)
      var currentImage = api.about.obs.image(id)
      var currentDescription = api.about.obs.description(id)

      var publishing = Value(false)
      var chosenImage = Value(currentImage())

      // don't display if name is default
      var chosenName = Value(currentName() === id.slice(1, 10) ? '' : currentName())
      var chosenDescription = Value(currentDescription())

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
          }, [i18n('Your Profile')]),
          h('ProfileEditor', [
            h('div.side', [
              h('ImageInput', [
                h('img', {
                  style: { 'background-color': api.about.obs.color(id) },
                  src: computed(chosenImage, (id) => id ? api.blob.sync.url(id) : fallbackImageUrl)
                }),
                h('span', ['🖼 ', i18n('Choose Profile Image...')]),
                api.blob.html.input(file => {
                  chosenImage.set(file.link)
                }, {
                  accept: 'image/*',
                  resize: { width: 500, height: 500 }
                })
              ])
            ]),
            h('div.main', [
              h('input.name', {
                placeholder: i18n('Choose a name'),
                hooks: [ValueHook(chosenName), FocusHook()]
              }),
              h('textarea.description', {
                placeholder: i18n('Describe yourself (if you want)'),
                hooks: [ValueHook(chosenDescription)]
              })
            ])
          ])
        ]),
        footer: [
          h('button -save', {
            'ev-click': save,
            'disabled': publishing
          }, when(publishing, i18n('Publishing...'), i18n('Publish'))),
          h('button -cancel', {
            'ev-click': close
          }, i18n('Cancel'))
        ]
      }

      function save () {
        // no confirm
        var update = {}
        var newName = chosenName().trim() || currentName()

        if (chosenImage() !== currentImage()) update.image = chosenImage()
        if (newName !== currentName()) update.name = newName
        if (chosenDescription() !== currentDescription()) update.description = chosenDescription()

        if (Object.keys(update).length) {
          publishing.set(true)
          api.sbot.async.publish(extend({
            type: 'about',
            about: id
          }, update), (err) => {
            if (err) {
              publishing.set(false)
              showDialog({
                type: 'error',
                title: i18n('Error'),
                buttons: [i18n('OK')],
                message: i18n('An error occurred while attempting to publish about message.'),
                detail: err.message
              })
            } else {
              close()
            }
          })
        } else {
          close()
        }
      }
    })
  })
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
