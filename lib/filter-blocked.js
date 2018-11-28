const async = require('async')
const pullFilterAsync = require('./pull-filter-async')

module.exports = function (blockSources, { isBlocking, checkRoot = false, useRootAuthorBlocks = false }) {
  return pullFilterAsync((msg, cb) => {
    var checks = []
    blockSources.forEach(source => {
      checks.push({ source, dest: msg.value.author })
      if (checkRoot && msg.root && msg.root.value) {
        checks.push({ source, dest: msg.root.value.author })
      }
    })

    if (useRootAuthorBlocks && msg.root && msg.root.value) {
      checks.push({ source: msg.root.value.author, dest: msg.value.author })
    }

    async.any(checks, isBlocking, (err, blocking) => {
      if (err) return cb(err)
      cb(null, !blocking)
    })
  }, 10)
}
