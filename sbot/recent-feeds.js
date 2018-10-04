var pull = require('pull-stream')
var pullCat = require('pull-cat')
var getTimestamp = require('../lib/get-timestamp')

module.exports = function (sbot, config) {
  return {
    stream: function ({live, since} = {}) {
      return pullCat([
        pull(
          sbot.createFeedStream({reverse: true, gt: since}),
          pull.filter(msg => {
            // filter out stuck items (also will be fixed by https://github.com/ssbc/secure-scuttlebutt/pull/215
            return getTimestamp(msg) > since
          }),
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
