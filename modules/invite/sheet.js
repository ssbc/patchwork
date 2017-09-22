var {h, when, Value, Proxy} = require('mutant')
var nest = require('depnest')
var electron = require('electron')

var appRoot = require('app-root-path');
var i18n = require(appRoot + '/lib/i18n').i18n

exports.needs = nest({
  'sheet.display': 'first',
  'invite.async.accept': 'first'
})

exports.gives = nest('invite.sheet')

exports.create = function (api) {
  return nest('invite.sheet', function () {
    api.sheet.display(close => {
      var publishing = Value()
      var publishStatus = Proxy()

      var input = h('input', {
        style: {
          'font-size': '200%',
          'margin-top': '20px',
          'width': '100%'
        },
        placeholder: i18n.__('paste invite code here')
      })
      setTimeout(() => {
        input.focus()
        input.select()
      }, 5)
      return {
        content: h('div', {
          style: {
            padding: '20px'
          }
        }, [
          h('h2', {
            style: {
              'font-weight': 'normal'
            }
          }, [i18n.__('By default, Patchwork will only see other users that are on the same local area network as you.')]),
          h('div', [
            i18n.__('In order to share with users on the internet, you need to be invited to a pub server.')
          ]),
          input
        ]),
        footer: [
          h('button -save', {
            disabled: publishing,
            'ev-click': () => {
              publishing.set(true)
              publishStatus.set(api.invite.async.accept(input.value.trim(), (err) => {
                if (err) {
                  publishing.set(false)
                  showDialog({
                    type: 'error',
                    title: i18n.__('Error'),
                    buttons: [i18n.__('OK')],
                    message: i18n.__('An error occurred while attempting to redeem invite.'),
                    detail: err.message
                  })
                } else {
                  close()
                }
              }))
            }
          }, [ when(publishing, publishStatus, i18n.__('Redeem Invite')) ]),
          h('button -cancel', {
            'ev-click': close
          }, i18n.__('Cancel'))
        ]
      }
    })
  })
}

function showDialog (opts) {
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}
