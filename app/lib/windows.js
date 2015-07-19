var BrowserWindow = require('browser-window')
var path = require('path')
var shell = require('shell')
var setupRpc = require('./muxrpc-ipc')
var blobslib = require('./blobs')

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
module.exports.open = function (url, sbot, blobs, opts, params) {
  var win = new BrowserWindow(opts)
  win.loadUrl(url)
  setupRpc(win, sbot, params)
  windows.push(win)
  
  win.on('closed', function() {
    var i = windows.indexOf(win)
    windows.splice(i, 1)
    win = null
  })
  
  win.webContents.on('new-window', function (e, url) {
    e.preventDefault() // hell naw
    if (url.indexOf('blob:') === 0) {
      // open the file
      blobs.checkout(url, function (err, filepath) {
        if (err) {
          if (err.badUrl)
            alert('Error: Not a valid file reference')
          else if (err.notFound) {
            // register want
            var hash = blobslib.url_parse(url).hash
            sbot.blobs.want(hash, {nowait: true}, function(){})
            // open search interface
            open(
              'file://' + path.join(__dirname, '../../node_modules/ssbplug-phoenix/blob-search.html'),
              sbot,
              blobs,
              { width: 600, height: 650, 'web-preferences': secureWebPreferences },
              { url: url, hash: hash }
            )
          } else
            console.log(err) // :TODO: something nicer
        } else {
          shell.openItem(filepath) // open in desktop's default program
        }
      })
    } else {
      // open in the browser
      shell.openExternal(url)
    }
  })

  return win
}