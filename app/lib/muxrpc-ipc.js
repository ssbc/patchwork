var ipc        = require('ipc')
var muxrpc     = require('muxrpc')
var pull       = require('pull-stream')
var pushable   = require('pull-pushable')
var Api        = require('scuttlebot/lib/api')

module.exports = function (window, sbot, params) {
  // construct api
  var api = Api(sbot)
  for (var k in sbot.manifest) {
    if (typeof sbot.manifest[k] == 'object')
      api[k] = sbot[k] // copy over the plugin APIs
  }

  // create rpc object
  var rpc = muxrpc(null, sbot.manifest, serialize)(api)
  rpc.authorized = { id: sbot.feed.id, role: 'master' }
  rpc.permissions({allow: null, deny: null})
  function serialize (stream) { return stream }

  // setup rpc stream over ipc
  var rpcStream = rpc.createStream()
  var ipcPush = pushable()
  ipc.on('muxrpc-ssb', function (e, msg) {
    if (e.sender == window.webContents)
      ipcPush.push(msg)
  })
  pull(ipcPush, rpcStream, pull.drain(
    function (msg) { window.webContents.send('muxrpc-ssb', msg) },
    function (err) { if (err) { console.error(err) } }
  ))

  // setup helper messages
  ipc.on('fetch-config', function(e) {
    if (e.sender == window.webContents)
      e.returnValue = sbot.config
  });
  ipc.on('fetch-params', function(e) {
    if (e.sender == window.webContents)
      e.returnValue = params
  });
}