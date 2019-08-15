const { h, when, Value } = require('mutant')
const nest = require('depnest')
const electron = require('electron')

exports.needs = nest({
  'sheet.display': 'first',
  'sbot.async.acceptDHT': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('dhtInvite.accept.sheet')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('dhtInvite.accept.sheet', function () {
    api.sheet.display(close => {
      const publishing = Value()

      const input = h('input', {
        style: {
          'font-size': '200%',
          'margin-top': '20px',
          width: '100%'
        },
        placeholder: i18n('paste invite code here')
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
          }, [i18n('Connect directly to friends currently online, using a peer-to-peer technology called "Distributed Hash Table"')]),
          input
        ]),
        footer: [
          h('button -save', {
            disabled: publishing,
            'ev-click': () => {
              publishing.set(true)
              api.sbot.async.acceptDHT(input.value.trim(), (err) => {
                if (err) {
                  publishing.set(false)
                  showDialog({
                    type: 'error',
                    title: i18n('Error'),
                    buttons: [i18n('OK')],
                    message: i18n('An error occurred while attempting to redeem invite.'),
                    detail: err.message
                  })
                } else {
                  close()
                }
              })
            }
          }, [when(publishing, i18n('Redeeming...'), i18n('Redeem Invite'))]),
          h('button -cancel', {
            'ev-click': close
          }, i18n('Cancel'))
        ]
      }
    })
  })
}

function showDialog (opts) {
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}
