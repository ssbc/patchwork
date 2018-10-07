var nest = require('depnest')
var { onceTrue } = require('mutant')

exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.gives = nest('about.async.latestValues')

exports.create = function (api) {
  return nest('about.async.latestValues', function (dest, keys, cb) {
    onceTrue(api.sbot.obs.connection, sbot => {
      sbot.patchwork.about.latestValues({ dest, keys }, cb)
    })
  })
}
