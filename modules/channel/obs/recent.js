var nest = require('depnest')
var MutantPullValue = require('../../../lib/mutant-pull-value')

exports.needs = nest({
  'sbot.pull.stream': 'first'
})

exports.gives = nest({
  'channel.obs.recent': true
})

exports.create = function (api) {
  return nest({
    'channel.obs.recent': function (limit) {
      return MutantPullValue(() => {
        return api.sbot.pull.stream((sbot) => sbot.patchwork.channels.recentStream({ limit: limit || 10 }))
      }, { defaultValue: [] })
    }
  })
}
