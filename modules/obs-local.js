var MutantSet = require('mutant/set')
var plugs = require('patchbay/plugs')
var sbot_list_local = plugs.first(exports.sbot_list_local = [])

exports.needs = {
  sbot: {
    list_local: 'first'
  }
}

exports.gives = {
  obs_local: true
}

exports.create = function (api) {
  var cache = null

  return {
    obs_local () {
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
  }
}
