var nest = require('depnest')
var MutantPullReduce = require('mutant-pull-reduce')

exports.needs = nest({
  'keys.sync.id': 'first',
  'sbot.pull.stream': 'first'
})

exports.gives = nest('channel.obs.subscribers')

exports.create = function (api) {
  return nest('channel.obs.subscribers', function (channel) {
    var stream = api.sbot.pull.stream(sbot => sbot.patchwork.subscriptions({live: true, channel}))
    return MutantPullReduce(stream, (state, msg) => {
      if (msg.value) {
        if (!state.includes(msg.from)) {
          state.push(msg.from)
        }
      } else {
        var index = state.indexOf(msg.from)
        if (index >= 0) {
          state.splice(index, 1)
        }
      }
      return state
    }, {
      startValue: [],
      nextTick: true,
      sync: true
    })
  })
}
