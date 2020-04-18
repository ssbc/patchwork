const { h, when, Value, Proxy, onceTrue, computed } = require('mutant')
const nest = require('depnest')
const electron = require('electron')

exports.needs = nest({
  'sheet.display': 'first',
  'invite.async.accept': 'first',
  'intl.sync.i18n': 'first',
  'sbot.obs.connection': 'first'
})

exports.gives = nest('invite.sheet')

exports.create = function (api) {
  const i18n = api.intl.sync.i18n
  return nest('invite.sheet', function () {
    api.sheet.display(close => {
      const publishing = Value()
      const publishStatus = Proxy()
      const foundPeerInvite = Value(false)
      const inviteInfo = Value('')

      const input = h('input', {
        style: {
          'font-size': '200%',
          'margin-top': '20px',
          width: '100%'
        },
        disabled: computed([publishing, foundPeerInvite],
          (pub, found) => pub || found),
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
          }, [
            when(foundPeerInvite, 'Found peer invite',
              i18n('By default, Patchwork will only see other users that are on the same local area network as you.')
            )
          ]),
          h('div', [
            when(foundPeerInvite, inviteInfo,
              i18n('In order to share with users on the internet, you need to be invited to a pub server or a room server.')
            )
          ]),
          input
        ]),
        footer: [
          when(foundPeerInvite,
            h('button -save', {
              disabled: publishing,
              'ev-click': () => {
                // when we've showed info from peer invite and the user have
                // clicked that they want to use the invite

                publishing.set(true)
                console.log('"using" peer invite')
                onceTrue(api.sbot.obs.connection, ssb => {
                  ssb.peerInvites.acceptInvite(input.value.trim(), err => {
                    if (err) {
                      publishing.set(true)
                      showErr(err)
                    } else {
                      console.log('peer invite used!')
                      close()
                    }
                  })
                })
              }
            },
            'Accept Invite'),
            h('button -save', {
              disabled: publishing,
              'ev-click': () => {
                publishing.set(true)
                publishStatus.set(api.invite.async.accept(input.value.trim(), (err, info) => {
                  if (err) {
                    publishing.set(false)
                    showErr(err)
                  } else {
                    if (info) {
                      // if info is there then we're dealing with a peer invite

                      console.log('info:', info)
                      inviteInfo.set(JSON.stringify(info.opened, null, 2))
                      publishing.set(false)
                      foundPeerInvite.set(true)
                    } else {
                      close()
                    }
                  }
                }))
              }
            },
            [when(publishing, publishStatus, i18n('Redeem Invite'))])
          ),
          h('button -cancel', {
            'ev-click': close
          }, i18n('Cancel'))
        ]
      }
    })
  })
}

function showErr (err) {
  console.error('failed to use invite:', err)
  showDialog({
    type: 'error',
    title: i18n('Error'),
    buttons: [i18n('OK')],
    message: i18n('An error occurred while attempting to redeem invite.'),
    detail: err.message
  })
}

function showDialog (opts) {
  electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opts)
}
