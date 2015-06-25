var app = require('app')
var Menu = require('menu')
var shell = require('shell')
var BrowserWindow = require('browser-window')
var path = require('path')

var config = require('ssb-config') 
var setupRpc = require('./lib/muxrpc-ipc')

// Report crashes to our server.
//require('crash-reporter').start();

var mainWindow

app.on('ready', function ready () {
  // setup blobs
  var blobs_dir = path.join(config.path, 'blobs')
  var downloads_dir = app.getPath('userDesktop')
  var blobs = require('./lib/blobs')(blobs_dir, downloads_dir)

  // start sbot
  require('scuttlebot').init(config, function (err, sbot) {
    // register protocols
    require('protocol').registerProtocol('blob', blobs.protocol)

    // open the web app
    mainWindow = new BrowserWindow({width: 1000, height: 720})
    mainWindow.loadUrl('file://' + path.join(__dirname, '../node_modules/ssbplug-phoenix/home.html'))
    mainWindow.webContents.on('new-window', onNewWindow)
    mainWindow.on('closed', function() { mainWindow = null })
    setupRpc(sbot, mainWindow)

    function onNewWindow (e, url) {
      e.preventDefault() // hell naw
      if (url.indexOf('blob:') === 0) {
        // open the file
        blobs.checkout(url, function (err, path) {
          if (err) {
            if (err.badUrl)
              alert('Error: Not a valid file reference')
            else if (err.notFound)
              alert('Error: This file has not yet been synced. Please try again soon.') // :TODO: show 'search' window
            else
              console.log(err) // :TODO: something nicer
          } else
            shell.openItem(path)
        })
      } else {
        // open in the browser
        shell.openExternal(url)
      }
    }

    // setup menu
    // Menu.setApplicationMenu(Menu.buildFromTemplate([{
    //   label: 'Window',
    //   submenu: [
    //     // { label: 'Open Web App', click: onopen },
    //     { label: 'Quit', click: onquit }
    //   ]
    // }]))

  })
});