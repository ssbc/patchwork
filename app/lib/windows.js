var BrowserWindow = require('browser-window')
var path = require('path')
var shell = require('shell')
var setupRpc = require('./muxrpc-ipc')

var windows = []

var secureWebPreferences = {
  javascript: true,
  'web-security': true,
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
module.exports.open = function (url, opts, params) {
  url = url || 'file://' + path.join(__dirname, '../../node_modules/ssb-patchwork-ui/main.html'),
  opts = opts || { width: 1030, height: 720 }

  var win = new BrowserWindow(opts)
  win.loadUrl(url)
  setupRpc(win, params)
  windows.push(win)
  
  win.on('closed', function() {
    var i = windows.indexOf(win)
    windows.splice(i, 1)
    win = null
  })
  
  win.webContents.on('new-window', function (e, url) {
    e.preventDefault() // hell naw
    // open in the browser
    shell.openExternal(url)
  })

  return win
}