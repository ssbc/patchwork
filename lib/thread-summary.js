const pull = require('pull-stream')
const getBump = require('./get-bump')

module.exports = function (dest, {
  recentLimit = 3,
  bumpFilter = null,
  recentFilter = null,
  readThread = null,
  messageFilter = null,
  pullFilter = null
}, cb) {
  const bumps = []
  let totalReplies = 0
  const latestReplies = []
  return pull(
    readThread({ reverse: true, live: false, dest }),
    pullFilter || pull.through(),
    pull.filter((msg) => msg && (!messageFilter || messageFilter(msg))),
    pull.drain(msg => {
      try {
        // bump filter can return values other than true that will be passed to view
        if (msg && msg.value && msg.value.content) {
          const type = msg.value.content.type

          if (type === 'post' || type === 'about') {
            if (latestReplies.length < recentLimit && (!recentFilter || recentFilter(msg))) {
              // collect the most recent bump messages
              latestReplies.unshift(msg)
            }
            totalReplies += 1
          }

          const bump = getBump(msg, bumpFilter)
          if (bump) bumps.push(bump)
        }
      } catch (ex) {
        cb(ex)
      }
    }, (err) => {
      if (err) return cb(err)
      cb(null, {
        bumps,
        totalReplies,
        latestReplies
      })
    })
  )
}
