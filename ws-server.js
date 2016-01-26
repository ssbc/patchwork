var muxrpc = require('muxrpc')
var pull = require('pull-stream')
var Serializer = require('pull-serializer')

module.exports = function (sbot, opts) {
  return function (stream) {
    // create rpc object
    var rpc = muxrpc({}, sbot.manifest(), serialize)(sbot)
    rpc.authorized = { id: sbot.id, role: 'master' }

    // start the stream
    pull(stream, rpc.createStream(), stream)
  }
}

function serialize (stream) {
  return Serializer(stream, JSON, {split: '\n\n'})
}