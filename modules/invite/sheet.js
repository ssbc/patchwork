var {h, when, Value, Proxy} = require('mutant')
var nest = require('depnest')
var electron = require('electron')

exports.needs = nest({
  'sheet.display': 'first',
  'intl.sync.format': 'first',
  'invite.async.accept': 'first'
})

exports.gives = nest('invite.sheet')

exports.create = function (api) {
  var format = api.intl.sync.format;
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
        placeholder: format('pasteCode')
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
          }, [format('seeLocalUsers')]),
          h('div', [
            format('needPub')
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
                    title: format('error'),
                    buttons: [format('ok')],
                    message: format('errorRedeemInvite'),
                    detail: err.message
                  })
                } else {
                  close()
                }
              }))
            }
          }, [ when(publishing, publishStatus, format('redeemInvite')) ]),
          h('button -cancel', {
            'ev-click': close
          }, format('Cancel'))
        ]
      }
    })
  })
}

function showDialog (opts) {
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}
