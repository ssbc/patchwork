var ipc        = require('ipc')
var muxrpc     = require('muxrpc')
var pull       = require('pull-stream')
var pullipc    = require('pull-ipc')

// fetch manifest
var manifest = ipc.sendSync('fetch-manifest')
console.log('got manifest', manifest)

// create rpc object
var env = window.env = muxrpc(manifest, {}, serialize)({})
function serialize (stream) { return stream }

// setup rpc stream over ipc
var rpcStream = env.createStream()
var ipcStream = pullipc('muxrpc', ipc, function (err) {
  console.log('ipc-stream ended', err)
})
pull(ipcStream, rpcStream, ipcStream)