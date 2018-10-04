var pull = require('pull-stream')
var getRoot = require('../lib/get-root')

exports.manifest = {
  read: 'source'
}

exports.init = function (ssb, config) {
  return { read }

  function read ({reverse = false, limit, types, live, old, dest}) {
    // TODO: properly handle truncation
    return pull(
      ssb.backlinks.read({
        private: true,
        reverse,
        live,
        index: 'DTA',
        query: [{$filter: { dest }}]
      }),
      pull.filter(msg => {
        if (msg.sync) return msg
        var type = msg.value.content.type
        var root = getRoot(msg)
        return root === dest && (!types || types.includes(type))
      }),
      limit ? pull.take(limit) : pull.through()
    )
  }
}
