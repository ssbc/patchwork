const pull = require('pull-stream')
const metaSummaryTypes = ['about', 'channel', 'contact']
const GroupUntil = require('./pull-group-until')

module.exports = function GroupSummaries ({ windowSize, ungroupFilter, getPriority }) {
  return pull(
    GroupUntil((result, msg) => {
      // stop grouping if more than 3 seconds between messages (waiting too long)
      if (!result.lastTime) {
        result.lastTime = Date.now()
      }

      if (result.lastTime && Date.now() - result.lastTime > 1e3) {
        return false
      }

      return (result.length < windowSize || metaSummaryTypes.includes(msg.value.content.type)) && result.length < windowSize * 2
    }),
    pull.map(function (msgs) {
      const result = []
      const groups = {}

      msgs.forEach(msg => {
        const type = (getPriority && getPriority(msg)) ? 'unreadMetaSummary' : 'metaSummary'
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
