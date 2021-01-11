const pull = require('pull-stream')

module.exports = function UniqueRoots () {
  const included = new Set()
  return pull.filter(msg => {
    if (!included.has(msg.rootId)) {
      included.add(msg.key)
      return true
    }
    return false
  })
}
