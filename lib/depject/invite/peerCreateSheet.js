var { h, when, Value, onceTrue } = require('mutant')
var nest = require('depnest')
var electron = require('electron')

exports.needs = nest({
  'sheet.display': 'first',
  'intl.sync.i18n': 'first',
  'sbot.obs.connection': 'first'
})

exports.gives = nest('peerInvite.create.sheet')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('peerInvite.create.sheet', function () {
    api.sheet.display(close => {
      var creating = Value()
      var inviteCode = Value()

      return {
        content: h('div', {
          style: {
            padding: '20px',
            display: 'grid'
          }
        }, [
          h('h2', { style: { 'font-weight': 'normal' } },
            [i18n('Create an invite that your friend can use to find you. You need to be followed by a pub with support for "peer invites".')]
          ),
          when(inviteCode,
            h('div', [
              h('div', {
                style: {
                  'word-break': 'break-all',
                  'font-family': 'monospace',
                  'font-size': '18px',
                  'user-select': 'all'
                }
              }, [inviteCode]),
              h('h2', [
                i18n('Give this invite code to one friend.')
              ])
            ]),
            h('button', {
              'ev-click': () => {
                creating.set(true)
                onceTrue(api.sbot.obs.connection, (ssb) => {
                  ssb.peerInvites.create({}, (err, code) => {
                    if (err) {
                      creating.set(false)
                      showDialog({
                        type: 'error',
                        title: i18n('Error'),
                        buttons: [i18n('OK')],
                        message: i18n('An error occurred while attempting to create invite.'),
                        detail: err.message
                      })
                    } else {
                      creating.set(false)
                      console.log('res', code)
                      inviteCode.set(code)
                    }
                  })
                })
                console.log('boop')
              }
            }, [ when(creating, i18n('Please wait...'), i18n('Create Invite')) ])
          )
        ]),
        footer: [
          h('button -cancel', {
            'ev-click': close
          }, when(inviteCode, i18n('Close'), i18n('Cancel')))
        ]
      }
    })
  })
}

function showDialog (opts) {
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}
