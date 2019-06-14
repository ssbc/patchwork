var nest = require('depnest')
var normalizeChannel = require('ssb-ref').normalizeChannel

exports.gives = nest('channel.sync.normalize')

exports.create = function (api) {
  return nest('channel.sync.normalize', normalizeChannel)
}
