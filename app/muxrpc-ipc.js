var ipc        = require('ipc')
var muxrpc     = require('muxrpc')
var pull       = require('pull-stream')
var pullipc    = require('pull-ipc')

var clientApi = {
  navigate: 'async',
  navigateHistory: 'async',
  navigateToggle: 'async',
  contextualToggleDevTools: 'async',
  triggerFind: 'async',
  focusSearch: 'async',
  zoomIn: 'async',
  zoomOut: 'async',
  zoomReset: 'async'
}

module.exports = function (window, sbot, params) {
  // add rpc APIs to window
  window.createRpc = function () {
    // create rpc object
    var rpc = window.rpc = muxrpc(clientApi, sbot.manifest(), serialize)(sbot)
    rpc.authorized = { id: sbot.id, role: 'master' }
    function serialize (stream) { return stream }

    // start the stream
    window.rpcStream = rpc.createStream()
    var ipcStream = pullipc('ssb-muxrpc', ipc, window, function (err) {
      console.log('ipc-stream ended', err)
    })
    pull(ipcStream, window.rpcStream, ipcStream)
  }
  window.resetRpc = function () {
    console.log('close rpc')
    window.rpcStream.source('close')
    window.rpc.close()
    window.createRpc()
  }

  // setup default stream
  window.createRpc()

  // setup helper messages
  ipc.on('fetch-manifest', function(e) {
    if (e.sender == window.webContents)
      e.returnValue = sbot.manifest()
  });
  ipc.on('fetch-params', function(e) {
    if (e.sender == window.webContents)
      e.returnValue = params
  });
}