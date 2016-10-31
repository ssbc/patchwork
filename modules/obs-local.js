var MutantSet = require('@mmckegg/mutant/set')
var plugs = require('patchbay/plugs')
var sbot_gossip_peers = plugs.first(exports.sbot_gossip_peers = [])
var ip = require('ip')

exports.obs_local = function () {
  var result = MutantSet([], {nextTick: true})
  sbot_gossip_peers((err, peers) => {
    if (err) throw console.log(err)
    peers.filter((peer) => {
      if (ip.isPrivate(peer.host) && (peer.source === 'local')) {
        console.log(peer)
        result.add(peer.key)
      }
    })
  })
  return result
}
