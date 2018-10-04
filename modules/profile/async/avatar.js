var nest = require('depnest')
var {onceTrue} = require('mutant')

exports.needs = nest({
  'sbot.obs.connection': 'first'
})

exports.gives = nest('profile.async.avatar')

exports.create = function (api) {
  return nest('profile.async.avatar', function (id, cb) {
    onceTrue(api.sbot.obs.connection, sbot => {
      sbot.patchwork.profile.avatar({id}, cb)
    })
  })
}
