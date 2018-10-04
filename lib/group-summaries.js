var pull = require('pull-stream')
var metaSummaryTypes = ['about', 'channel', 'contact']

module.exports = function GroupSummaries ({windowSize, ungroupFilter, getPriority}) {
  return pull(
    GroupUntil((result, msg) => result.length < windowSize || metaSummaryTypes.includes(msg.value.content.type)),
    pull.map(function (msgs) {
      var result = []
      var groups = {}

      msgs.forEach(msg => {
        var type = (getPriority && getPriority(msg)) ? 'unreadMetaSummary' : 'metaSummary'
        if (metaSummaryTypes.includes(msg.value.content.type) && !msg.totalReplies && (!ungroupFilter || !ungroupFilter(msg))) {
          if (!groups[type]) {
            groups[type] = {group: type, msgs: []}
            result.push(groups[type])
          }
          groups[type].msgs.push(msg)
        } else {
          result.push(msg)
        }
      })

      return result
    }),
    pull.flatten()
  )
}

function GroupUntil (check) {
  var ended = false
  var queue = []
  return function (read) {
    return function (end, cb) {
      // this means that the upstream is sending an error.
      if (end) {
        ended = end
        return read(ended, cb)
      }
      // this means that we read an end before.
      if (ended) return cb(ended)

      read(null, function next (end, data) {
        ended = ended || end

        if (ended) {
          if (!queue.length) {
            return cb(ended)
          }

          let _queue = queue
          queue = []
          return cb(null, _queue)
        }

        if (check(queue, data)) {
          queue.push(data)
          read(null, next)
        } else {
          let _queue = queue
          queue = [data]
          cb(null, _queue)
        }
      })
    }
  }
}
