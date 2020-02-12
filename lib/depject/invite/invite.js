'use strict'
const ref = require('ssb-ref')
const ssbClient = require('ssb-client')
const roomUtils = require('ssb-room/utils')
const Value = require('mutant/value')
const nest = require('depnest')

exports.needs = nest({
  'sbot.async.publish': 'first',
  'sbot.async.connRememberConnect': 'first',
  'sbot.async.acceptDHT': 'first',
  'contact.async.followerOf': 'first',
  'keys.sync.id': 'first',
  'config.sync.load': 'first'
})

exports.gives = nest({
  'invite.async.accept': true,
  'invite.async.autofollow': true
})

exports.create = function (api) {
  function accept (invite, cb) {
    const progress = Value('Connecting...')

    if (roomUtils.isInvite(invite)) {
      const address = roomUtils.inviteToAddress(invite)
      api.sbot.async.connRememberConnect(address, { type: 'room' }, cb)
      return
    }
    if (invite.startsWith('dht:')) {
      api.sbot.async.acceptDHT(invite, () => {})
      return cb(null, true)
    }

    const data = ref.parseInvite(invite)
    const id = api.keys.sync.id()
    const config = api.config.sync.load()

    if (!data) return cb(new Error('Not a valid invite code. Please make sure you copied the entire code and try again.'))

    api.sbot.async.connRememberConnect(data.remote, { type: 'pub' }, (err) => {
      if (err) console.log(err)
    })

    // connect to the remote pub using the invite code
    ssbClient(null, {
      remote: data.invite,
      manifest: { invite: { use: 'async' }, getAddress: 'async' },
      appKey: config.caps && config.caps.shs
    }, function (err, sbot) {
      if (err) return cb(err)
      progress.set('Requesting follow...')

      // ask them to follow us
      sbot.invite.use({ feed: id }, function (err) {
        if (err) {
          // the probably already follow us
          api.contact.async.followerOf(id, data.key, function (_, follows) {
            if (follows) {
              cb()
            } else {
              next()
            }
          })
        } else {
          next()
        }
      })
    })

    function next () {
      progress.set('Following...')

      const address = ref.parseAddress(data.remote)

      if (address.host) {
        api.sbot.async.publish({
          type: 'pub',
          address
        })
      }

      api.sbot.async.publish({
        type: 'contact',
        contact: data.key,
        following: true,
        autofollow: true
      }, cb)
    }

    return progress
  }
  return nest({
    'invite.async.accept': accept,
    // like invite, but check whether we already follow them first
    'invite.async.autofollow': function (invite, cb) {
      const id = api.keys.sync.id()
      const data = ref.parseInvite(invite)
      api.contact.async.followerOf(id, data.key, function (_, follows) {
        if (follows) console.log('already following', cb())
        else console.log('accept invite:' + invite, accept(invite, cb))
      })
    }
  })
}
