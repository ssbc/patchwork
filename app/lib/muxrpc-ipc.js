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


  // add rpc APIs to window
  window.createRpc = function () {
    // create rpc object
    var rpc = window.rpc = muxrpc(null, sbot.manifest, serialize)(api)
    rpc.authorized = { id: sbot.feed.id, role: 'master' }
    rpc.permissions({allow: null, deny: null})
    function serialize (stream) { return stream }

    // start the stream
    window.rpcStream = rpc.createStream()
    var ipcPush = pushable()
    ipc.on('muxrpc-ssb', function (e, msg) {
      if (e.sender == window.webContents) {
        try {
          if (typeof msg == 'string')
            msg = JSON.parse(msg)
        } catch (e) {
          return
        }
        if (msg.bvalue) {
          msg.value = new Buffer(msg.bvalue, 'base64')
          delete msg.bvalue
        }
        ipcPush.push(msg)
      }
    })
    pull(ipcPush, window.rpcStream, pull.drain(
      function (msg) { 
        if (msg.value && Buffer.isBuffer(msg.value)) {
          // convert buffers to base64
          msg.bvalue = msg.value.toString('base64')
          delete msg.value
        }
        window.webContents.send('muxrpc-ssb', JSON.stringify(msg))
      },
      function (err) { if (err) { console.error(err) } }
    ))
  }
  window.resetRpc = function () {
    console.log('close rpc')
    window.rpcStream.source(true)
    window.rpc.close()
    window.createRpc()
  }

  // setup default stream
  window.createRpc()

  // setup helper messages
  ipc.on('fetch-manifest', function(e) {
    if (e.sender == window.webContents)
      e.returnValue = sbot.manifest
  });
  ipc.on('fetch-params', function(e) {
    if (e.sender == window.webContents)
      e.returnValue = params
  });
}