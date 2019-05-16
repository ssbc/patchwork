const async = require('async')
const pull = require('pull-stream')
const pullFilterAsync = require('./pull-filter-async')
const paramap = require('pull-paramap')
const _ = require('lodash')

module.exports = function (blockSources, { isBlocking, checkRoot = false, useRootAuthorBlocks = false }) {
  // Maybe hacky but it seems true in practice
  const me = blockSources[0]
  return pull(
    paramap((msg, cb) => {
      var checks = []

      // It doesn't make sense to have the forEach here if blockSources would
      // only contain you and the thread author, but I think this code is in
      // preparation for block lists, in which case it makes sense
      blockSources.forEach(source => {
        if (msg.value) {
          checks.push({ source, dest: msg.value.author })
        }
        if (checkRoot && msg.root && msg.root.value) {
          checks.push({ source, dest: msg.root.value.author })
        }
      })

      if (useRootAuthorBlocks && msg.root && msg.root.value) {
        checks.push({ source: msg.root.value.author, dest: msg.value.author })
      }

      async.map(checks, isBlocking, (err, res) => {
        if (err) return cb(err)

        // Important that we start with 0 (us), we're prioritized above thread
        // authors
        for (let i = 0; i < checks.length; i++) {
          if (res[i]) {
            if (!msg.value.meta) msg.value.meta = {}
            msg.value.meta.blockedBy = {
              id: checks[i].source,
              role: checks[i].source === me ? 'me' : 'threadAuthor'
            }
            return cb(null, msg)
          }
        }
        cb(null, msg)
      })
    }),
    pullFilterAsync((msg, cb) => {
      // Only completely remove the msg if we are the blocker
      cb(null, _.get(msg, 'value.meta.blockedBy.role') !== 'me')
    }, 10)
  )
}
