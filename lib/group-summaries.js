var pull = require('pull-stream')
var metaSummaryTypes = ['about', 'channel', 'contact']
var GroupUntil = require('./pull-group-until')

module.exports = function GroupSummaries ({ windowSize, ungroupFilter, getPriority }) {
  return pull(
    GroupUntil((result, msg) => result.length < windowSize || metaSummaryTypes.includes(msg.value.content.type)),
    pull.map(function (msgs) {
      var result = []
      var groups = {}

      msgs.forEach(msg => {
        var type = (getPriority && getPriority(msg)) ? 'unreadMetaSummary' : 'metaSummary'
        if (metaSummaryTypes.includes(msg.value.content.type) && !msg.totalReplies && (!ungroupFilter || !ungroupFilter(msg))) {
          if (!groups[type]) {
            groups[type] = { group: type, msgs: [] }
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
