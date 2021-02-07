const shortFeedId = require('../../about/sync.js')
const nest = require('depnest')
const extend = require('xtend')
const { Value, h, computed, when } = require('mutant')
const fallbackImageUrl = 'data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
const displaySheet = require('../../../sheet/display')

exports.gives = nest('profile.sheet.edit')

exports.needs = nest({
  'keys.sync.id': 'first',
  'message.async.publish': 'first',
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
  'suggest.hook': 'first'
})

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('profile.sheet.edit', function ({ usePreview = true } = {}) {
    const id = api.keys.sync.id()
    displaySheet(close => {
      const currentName = api.about.obs.name(id)
      const currentImage = api.about.obs.image(id)
      const currentDescription = api.about.obs.description(id)

      const publishing = Value(false)
      const chosenImage = Value(currentImage())

      // don't display if name is default
      const chosenName = Value(currentName() === shortFeedId(id) ? '' : currentName())
      const chosenDescription = Value(currentDescription())

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
                api.blob.html.input((err, file) => {
                  if (err) return
                  chosenImage.set(file.link)
                }, {
                  accept: 'image/*',
                  resize: { width: 500, height: 500 }
                })
              ])
            ]),
            h('div.main', [
              h('input.name', {
                disabled: publishing,
                placeholder: i18n('Choose a name'),
                hooks: [ValueHook(chosenName), FocusHook()]
              }),
              h('textarea.description', {
                disabled: publishing,
                placeholder: i18n('Describe yourself (if you want)'),
                hooks: [ValueHook(chosenDescription), api.suggest.hook()]
              })
            ])
          ])
        ]),
        footer: [
          h('button -save', {
            'ev-click': save,
            disabled: publishing
          }, when(publishing,
            i18n('Publishing...'),
            usePreview ? i18n('Preview & Publish') : i18n('Publish')
          )),
          h('button -cancel', {
            disabled: publishing,
            'ev-click': close
          }, i18n('Cancel'))
        ]
      }

      function save () {
        // no confirm
        const update = {}
        const newName = chosenName().trim() || currentName()

        if (chosenImage() !== currentImage()) update.image = chosenImage()
        if (newName !== currentName()) update.name = newName
        if (chosenDescription() !== currentDescription()) update.description = chosenDescription()

        if (Object.keys(update).length) {
          publishing.set(true)

          const publish = usePreview
            ? api.message.async.publish
            : api.sbot.async.publish
          publish(extend({
            type: 'about',
            about: id
          }, update), (err, msg) => {
            publishing.set(false)
            if (err) {
              showDialog({
                type: 'error',
                title: i18n('Error'),
                buttons: [i18n('OK')],
                message: i18n('An error occurred while attempting to publish about message.'),
                detail: err.message
              })
            } else if (msg) {
              // user confirmed publish, so close the dialog
              close()
            }
          })
        } else {
          showDialog({
            type: 'info',
            title: i18n('Update Profile'),
            buttons: [i18n('OK')],
            message: i18n('Nothing to publish'),
            detail: i18n('You have not made any changes.')
          })
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
  const electron = require('electron')
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}
