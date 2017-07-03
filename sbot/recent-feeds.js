var pull = require('pull-stream')
var pullCat = require('pull-cat')

module.exports = function (sbot, config) {
  return {
    stream: function ({live, since} = {}) {
      return pullCat([
        pull(
          sbot.createFeedStream({reverse: true, gt: since}),
          pull.map(msg => msg.value.author),
          pull.unique()
        ),

        // live
        live ? pull.values([{sync: true}]) : pull.empty(),
        live ? pull(
          sbot.createFeedStream({old: false}),
          pull.map(msg => msg.value.author)
        ) : pull.empty()
      ])
    }
  }
}
