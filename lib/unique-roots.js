const pull = require('pull-stream')

module.exports = function UniqueRoots () {
  var included = new Set()
  return pull.filter(msg => {
    if (!included.has(msg.rootId)) {
      included.add(msg.key)
      return true
    }
  })
}
