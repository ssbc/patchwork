// FROM: https://github.com/ssbc/scuttlebot/blob/master/plugins/local.js

var broadcast = require('broadcast-stream')
var ref = require('ssb-ref')
var valid = require('scuttlebot/lib/validators')

// local plugin
// broadcasts the address:port:pubkey triple of the sbot server
// on the LAN, using multicast UDP

function isFunction (f) {
  return 'function' === typeof f
}

module.exports = {
  name: 'local',
  version: '2.0.0',
  manifest: {
    list: 'sync'
  },
  init: function (sbot, config) {
    var local = broadcast(config.port)
    var lastSeen = {}
    var localKeys = new Set()

    setInterval(function () {
      Object.keys(lastSeen).forEach((key) => {
        if (Date.now() - lastSeen[key] < 10e3) {
          localKeys.add(key)
        } else {
          localKeys.delete(key)
          delete lastSeen[key]
        }
      })
    }, 5e3)

    local.on('data', function (buf) {
      if (buf.loopback) return
      var data = buf.toString()
      var peer = ref.parseAddress(data)
      if (peer) {
        lastSeen[peer.key] = Date.now()
        sbot.gossip.add(data, 'local')
      }
    })

    setInterval(function () {
      // broadcast self
      // TODO: sign beacons, so that receipient can be confidant
      // that is really your id.
      // (which means they can update their peer table)
      // Oh if this includes your local address,
      // then it becomes unforgeable.
      local.write(sbot.getAddress())
    }, 1000)

    return {
      list: valid.sync(function () {
        return Array.from(localKeys)
      })
    }
  }
}
