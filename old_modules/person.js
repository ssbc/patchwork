var plugs = require('patchbay/plugs')
var avatar_name = plugs.first(exports.avatar_name = [])
var avatar_link = plugs.first(exports.avatar_link = [])

exports.person = person

function person (id) {
  return avatar_link(id, avatar_name(id), '')
}
