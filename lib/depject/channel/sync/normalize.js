const nest = require('depnest')
const normalizeChannel = require('ssb-ref').normalizeChannel

exports.gives = nest('channel.sync.normalize')

exports.create = function () {
  return nest('channel.sync.normalize', normalizeChannel)
}
