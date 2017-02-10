var MutantSet = require('@mmckegg/mutant/set')
var plugs = require('patchbay/plugs')
var sbot_list_local = plugs.first(exports.sbot_list_local = [])

var cache = null

exports.obs_local = function () {
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
    sbot_list_local((err, keys) => {
      if (err) throw console.log(err)
      result.set(keys)
    })
  }
}
