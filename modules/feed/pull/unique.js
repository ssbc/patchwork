var pull = require('pull-stream')
var nest = require('depnest')

exports.gives = nest('feed.pull.unique', true)

exports.create = function (api) {
  return nest('feed.pull.unique', function (rootFilter) {
    var seen = new Set()
    return pull.filter(idOrMsg => {
      if (idOrMsg) {
        if (idOrMsg.key) idOrMsg = idOrMsg.key
        if (typeof idOrMsg === 'string') {
          var key = idOrMsg
          if (!seen.has(key)) {
            seen.add(key)
            return true
          }
        }
      }
    })
  })
}
