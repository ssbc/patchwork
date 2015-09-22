var ipc        = require('ipc')
var muxrpc     = require('muxrpc')
var pull       = require('pull-stream')
var pullipc    = require('pull-ipc')
var ui         = require('./ui')

var clientApiManifest = {
  navigate: 'async',
  contextualToggleDevTools: 'async',
  triggerFind: 'async'
}

var clientApi = {
  navigate: function (path, cb) {
    window.location.hash = '#/webview/'+path
    cb()
  },
  contextualToggleDevTools: function (cb) {
    ui.toggleDevTools()
    cb()
  },
  triggerFind: function (cb) {
    ui.triggerFind()
    cb()
  }
}

module.exports = function () {
  // fetch manifest
  var manifest = ipc.sendSync('fetch-manifest')
  console.log('got manifest', manifest)

  // create rpc object
  var ssb = muxrpc(manifest, clientApiManifest, serialize)(clientApi)
  function serialize (stream) { return stream }

  // setup rpc stream over ipc
  var rpcStream = ssb.createStream()
  var ipcStream = pullipc('ssb-muxrpc', ipc, function (err) {
    console.log('ipc-stream ended', err)
  })
  pull(ipcStream, rpcStream, ipcStream)

  return ssb
}