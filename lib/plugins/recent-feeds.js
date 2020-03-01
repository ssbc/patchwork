const pull = require('pull-stream')
const pullCat = require('pull-cat')

module.exports = function (sbot) {
  return {
    stream: function ({ live = null, since = null } = {}) {
      return pullCat([
        pull(
          sbot.createFeedStream({ reverse: true, gt: since }),
          pull.map(msg => msg.value.author),
          pull.unique()
        ),

        // live
        live ? pull.values([{ sync: true }]) : pull.empty(),
        live ? pull(
          sbot.createFeedStream({ old: false }),
          pull.map(msg => msg.value.author)
        ) : pull.empty()
      ])
    }
  }
}
