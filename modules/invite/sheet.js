var {h, when, Value, Proxy} = require('mutant')
var nest = require('depnest')
var electron = require('electron')

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
        placeholder: 'paste invite code here'
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
          }, ['By default, Patchwork will only see other users that are on the same local area network as you.']),
          h('div', [
            'In order to share with users on the internet, you need to be invited to a pub server.'
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
                    title: 'Error',
                    buttons: ['OK'],
                    message: 'An error occurred while attempting to redeem invite.',
                    detail: err.message
                  })
                } else {
                  close()
                }
              }))
            }
          }, [ when(publishing, publishStatus, 'Redeem Invite') ]),
          h('button -cancel', {
            'ev-click': close
          }, 'Cancel')
        ]
      }
    })
  })
}

function showDialog (opts) {
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}
