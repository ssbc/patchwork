const pull = require('pull-stream')
module.exports = function (ssb) {
  const subscriptions = new Set()
  return {
    subscribe: function (id) {
      subscriptions.add(id)
    },
    unsubscribe: function (id) {
      subscriptions.delete(id)
    },
    stream: function () {
      return pull(
        ssb.backlinks.read({ old: false, index: 'DTS' }),
        pull.filter(x => subscriptions.has(x.dest))
      )
    }
  }
}
