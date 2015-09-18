var BrowserWindow = require('browser-window')
var Menu          = require('menu')
var dialog        = require('dialog')
var path          = require('path')
var shell         = require('shell')
var ipc           = require('ipc')
var muxrpc        = require('muxrpc')
var pull          = require('pull-stream')
var toPull        = require('stream-to-pull-stream')
var pullipc       = require('pull-ipc')
var URL           = require('url')
var fs            = require('fs')

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
  win.contentInfo = {
    url: url,
    param: url ? URL.parse(url).pathname : null,
    isblob: (url.indexOf('http://localhost:7777') === 0),
    isfile: (url.indexOf('http://localhost:7778') === 0),
  }
  if (manifest && rpcapi)
    setupRpc(win, manifest, rpcapi)

  // create the menu
  var appmenu
  if (win.contentInfo.isfile) {
    appmenu = [{
      label: 'Freeze Snapshot',
      accelerator: 'CmdOrCtrl+P',
      click: function (e, window) {
        // add file to blobstore
        var sbot = require('./sbot').get()
        pull(
          toPull.source(fs.createReadStream(win.contentInfo.param)),
          sbot.blobs.add(function (err, hash) {
            if (err) {
              console.error(err)
              dialog.showErrorBox('Failed to Freeze Snapshot', err.message || err)
            } else {
              dialog.showMessageBox(window, {
                type: 'info',
                title: 'Snapshot\'s Hash',
                message: 'Snapshot\'s Hash',
                detail: hash,
                buttons: ['OK']
              })
            }
          })
        )
      }
    }]
  }
  win.menu = require('./menu').create({ appmenu: appmenu })
  win.setMenu(win.menu)
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
      var sbot = require('./sbot').get()
      open(url, { preload: path.join(__dirname, '../ui/app-preload.js') }, sbot.manifest(), sbot)
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