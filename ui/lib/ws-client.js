var muxrpc     = require('muxrpc')
var pull       = require('pull-stream')
var ws         = require('pull-ws-server')
var Serializer = require('pull-serializer')

module.exports = function () {
  // create rpc object
  var ssb = muxrpc(window.MANIFEST, false, serialize)()

  // setup rpc stream over websockets
  var protocol = (window.location.protocol == 'https:') ? 'wss:' : 'ws:'
  var stream = ws.connect(protocol+'//'+(window.location.hostname)+':7777', { onClose: onConnectionLost })
  pull(stream, ssb.createStream(), stream)
  return ssb
}

function serialize (stream) {
  return Serializer(stream, JSON, {split: '\n\n'})
}

function onConnectionLost () {
  document.body.classList.add('connection-lost')
}