var app = require('app')
var Tray = require('tray')
var Menu = require('menu')
var shell = require('shell')
var config = require('ssb-config') 

// Report crashes to our server.
//require('crash-reporter').start();

var tray

app.on('ready', function ready () {
  // start sbot
	require('scuttlebot').init(config, function (err, sbot) {

    // setup tray icon
    tray = new Tray(__dirname+'/icon.png')
    var contextMenu = Menu.buildFromTemplate([
      { label: 'Open App', click: onopen },
      { label: 'Quit', click: onquit }
    ])
    tray.setContextMenu(contextMenu)
    tray.setToolTip('Secure Scuttlebutt: Running on port 8008')
    tray.on('double-clicked', onopen)

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