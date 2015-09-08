var BrowserWindow = require('browser-window')
var Menu          = require('menu')
var path          = require('path')
var shell         = require('shell')
var ipc           = require('ipc')
var muxrpc        = require('muxrpc')
var pull          = require('pull-stream')
var pullipc       = require('pull-ipc')

var windows = []
var clientApi = {}
var requiredOpts = {
  javascript: true,
  'web-security': true,
  'node-integration': false,
  images: true,
  java: false,
  webgl: false, // maybe allow?
  webaudio: false, // maybe allow?
  plugins: false,
  'experimental-features': false,
  'experimental-canvas-features': false,
  'shared-worker': false
}

var open =
module.exports.open = function (url, opts, manifest, rpcapi) {
  opts = opts || { width: 1030, height: 720 }

  // copy over fixed options
  for (var k in requiredOpts)
    opts[k] = requiredOpts[k]

  // setup the window
  var win = new BrowserWindow(opts)
  win.loadUrl(url)
  if (manifest && rpcapi)
    setupRpc(win, manifest, rpcapi)
  win.setMenu(win.menu = require('./menu').create())
  if (process.platform == 'darwin')
    Menu.setApplicationMenu(win.menu)

  // manage the window's lifecycle
  windows.push(win)
  win.on('closed', function() {
    var i = windows.indexOf(win)
    windows.splice(i, 1)
    win = null
  })
  
  // event handlers
  win.webContents.on('new-window', function (e, url) {
    e.preventDefault()
    // open in the browser
    shell.openExternal(url)
  })

  return win
}

module.exports.openLauncher = function () {
  return open('file://' + path.join(__dirname, '../ui/launcher.html'), 
    { preload: path.join(__dirname, '../ui/launcher-preload.js'), width: 340, height: 200 },
    { open: 'async' },
    { open: function (url, cb) {
      open(url, null)
      cb()
    }}
  )
}

function setupRpc (window, manifest, rpcapi) {
  // add rpc APIs to window
  window.createRpc = function () {
    // create rpc object
    var rpc = window.rpc = muxrpc(clientApi, manifest, serialize)(rpcapi)
    function serialize (stream) { return stream }

    // start the stream
    window.rpcstream = rpc.createStream()
    var ipcstream = pullipc('muxrpc', ipc, window, function (err) {
      console.log('ipc-stream ended', err)
    })
    pull(ipcstream, window.rpcstream, ipcstream)
  }
  window.resetRpc = function () {
    console.log('close rpc')
    window.rpcstream.source('close')
    window.rpc.close()
    window.createRpc()
  }

  // setup default stream
  window.createRpc()

  // setup helper messages
  ipc.on('fetch-manifest', function(e) {
    if (e.sender == window.webContents)
      e.returnValue = manifest
  })
}