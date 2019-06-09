const pull = require('pull-stream')
const getBump = require('./get-bump')

module.exports = function (dest, { recentLimit = 3, bumpFilter, recentFilter, readThread, messageFilter, pullFilter }, cb) {
  var bumps = []
  var totalReplies = 0
  var latestReplies = []
  return pull(
    readThread({ reverse: true, live: false, dest }),
    pullFilter || pull.through(),
    pull.filter((msg) => msg && (!messageFilter || messageFilter(msg))),
    pull.drain(msg => {
      try {
        // bump filter can return values other than true that will be passed to view
        if (msg && msg.value && msg.value.content) {
          let type = msg.value.content.type

          if (type === 'post' || type === 'about') {
            if (latestReplies.length < recentLimit && (!recentFilter || recentFilter(msg))) {
              // collect the most recent bump messages
              latestReplies.unshift(msg)
            }
            totalReplies += 1
          }

          let bump = getBump(msg, bumpFilter)
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
