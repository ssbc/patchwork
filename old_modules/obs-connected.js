var MutantSet = require('@mmckegg/mutant/set')
var plugs = require('patchbay/plugs')
var sbot_gossip_peers = plugs.first(exports.sbot_gossip_peers = [])

var cache = null

exports.obs_connected = function () {
  if (cache) {
    return cache
  } else {
    var result = MutantSet([], {nextTick: true})
    // todo: make this clean up on unlisten

    refresh()
    setInterval(refresh, 10e3)

    cache = result
    return result
  }

  // scope

  function refresh () {
    sbot_gossip_peers((err, peers) => {
      if (err) throw console.log(err)
      result.set(peers.filter(x => x.state === 'connected').map(x => x.key))
    })
  }
}
