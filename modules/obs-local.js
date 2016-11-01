var MutantSet = require('@mmckegg/mutant/set')
var plugs = require('patchbay/plugs')
var sbot_gossip_peers = plugs.first(exports.sbot_gossip_peers = [])
var ip = require('ip')

var cache = null

exports.obs_local = function () {
  if (cache) {
    return cache
  } else {
    var result = MutantSet([], {nextTick: true})
    // todo: make this clean up on unlisten

    setTimeout(() => {
      sbot_gossip_peers((err, peers) => {
        if (err) throw console.log(err)
        peers.filter((peer) => {
          if (ip.isPrivate(peer.host) && (peer.source === 'local')) {
            console.log(peer)
            result.add(peer.key)
          }
        })
      })
    }, 5000)

    cache = result
    return result
  }
}
