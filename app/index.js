var app = require('app')
var path = require('path')
var Tray = require('tray')
var Menu = require('menu')
var shell = require('shell')
var BrowserWindow = require('browser-window')

var config = require('ssb-config') 
var toPath = require('multiblob/util').toPath

// Report crashes to our server.
//require('crash-reporter').start();

var tray
var mainWindow

app.on('ready', function ready () {
  var blobs_dir = path.join(config.path, 'blobs')

  // start sbot
  require('scuttlebot').init(config, function (err, sbot) {
    // register protocols
    require('protocol').registerProtocol('blob', require('./lib/blob-protocol')(config))

    // open the web app
    mainWindow = new BrowserWindow({width: 1000, height: 720})
    mainWindow.loadUrl('file://' + __dirname + '/index.html')
    mainWindow.webContents.on('new-window', onNewWindow)
    mainWindow.on('closed', function() { mainWindow = null })

    function onNewWindow (e, url) {
      e.preventDefault() // hell naw
      if (url.indexOf('blob:') === 0) {
        // open the file
        var id = url.split(':')[1]
        shell.openItem(toPath(blobs_dir, id))
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

    // setup tray icon
    tray = new Tray(__dirname+'/icon.png')
    tray.setContextMenu(Menu.buildFromTemplate([
      // { label: 'Open Web App', click: onopen },
      { label: 'Quit', click: onquit }
    ]))
    tray.setToolTip('Secure Scuttlebutt: Running on port 8008')
    // tray.on('double-clicked', onopen)

    // menu handlers
    function onopen () {
      shell.openExternal('http://localhost:8008')
    }
    function onquit () {
      tray = null
      sbot.close()
      process.exit()
    }

  })
});