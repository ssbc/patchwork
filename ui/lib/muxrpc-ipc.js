var ipc        = require('ipc')
var muxrpc     = require('muxrpc')
var pull       = require('pull-stream')
var pullipc    = require('pull-ipc')
var remote     = require('remote')
var webFrame   = require('web-frame')
var app

function getApp() {
  if (!app)
    app = require('./app')
  return app
}

var clientApiManifest = {
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

var zoomStep = 0.5;

var clientApi = {
  navigate: function (path, cb) {
    window.location.hash = '#'+path
    cb()
  },
  navigateHistory: function (direction, cb) {
    window.history.go(direction)
    cb()
  },
  navigateToggle: function (id, cb) {
    getApp().emit('toggle:rightnav', id)
    cb()
  },
  contextualToggleDevTools: function (cb) {
    remote.getCurrentWindow().toggleDevTools()
    cb()
  },
  triggerFind: function (cb) {
    // ui.triggerFind() :TODO:
    cb()
  },
  focusSearch: function (cb) {
    getApp().emit('focus:search')
    cb()
  },
  zoomIn: function (cb) {
    webFrame.setZoomLevel(webFrame.getZoomLevel() + zoomStep)
    cb()
  },
  zoomOut: function (cb) {
    webFrame.setZoomLevel(webFrame.getZoomLevel() - zoomStep)
    cb()
  },
  zoomReset: function (cb) {
    webFrame.setZoomLevel(0)
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