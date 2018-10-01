var {h, when, Value} = require('mutant')
var nest = require('depnest')
var electron = require('electron')

exports.needs = nest({
  'sheet.display': 'first',
  'sbot.async.createDHT': 'first',
  'intl.sync.i18n': 'first'
})

exports.gives = nest('dhtInvite.create.sheet')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('dhtInvite.create.sheet', function () {
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
            [i18n('Connect directly to friends currently online, using a peer-to-peer technology called "Distributed Hash Table"')]
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
                i18n('Give this invite code to one friend. '),
                i18n('You will sync when you are both online.')
              ])
            ]),
            h('button', {
              'ev-click': () => {
                api.sbot.async.createDHT((err, code) => {
                  if (err) {
                    created.set(false)
                    showDialog({
                      type: 'error',
                      title: i18n('Error'),
                      buttons: [i18n('OK')],
                      message: i18n('An error occurred while attempting to create invite.'),
                      detail: err.message
                    })
                  } else {
                    inviteCode.set(code)
                  }
                })
              }
            }, [ when(creating, i18n('Please wait...'), i18n('Create DHT Invite')) ])
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
