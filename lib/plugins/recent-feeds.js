const pull = require('pull-stream')
const pullCat = require('pull-cat')

module.exports = function (sbot) {
  return {
    stream: function ({ live = null, since = null } = {}) {
      const pipe = [
        pull(
          sbot.createFeedStream({ reverse: true, gt: since }),
          pull.map(msg => msg.value.author),
          pull.unique()
        )
      ]

      if (live) {
        pipe.push(pull.values([{ sync: true }]))
        pipe.push(pull(sbot.createFeedStream({ old: false }),
          pull.map(msg => msg.value.author)
        ))
      }
      return pullCat(pipe)
    }
  }
}
