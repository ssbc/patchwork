var MutantSet = require('mutant/set')

exports.needs = {
  sbot: {
    gossip_peers: 'first'
  }
}

exports.gives = {
  obs_connected: true
}

exports.create = function (api) {
  var cache = null

  return {
    obs_connected () {
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
        api.sbot.gossip_peers((err, peers) => {
          if (err) throw console.log(err)
          result.set(peers.filter(x => x.state === 'connected').map(x => x.key))
        })
      }
    }
  }
}
