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
    // open the web app
    shell.openExternal('http://localhost:8008')

    // setup menu
    Menu.setApplicationMenu(Menu.buildFromTemplate([{
      label: 'Window',
      submenu: [
        { label: 'Open Web App', click: onopen },
        { label: 'Quit', click: onquit }
      ]
    }]))

    // setup tray icon
    tray = new Tray(__dirname+'/icon.png')
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Open Web App', click: onopen },
      { label: 'Quit', click: onquit }
    ]))
    tray.setToolTip('Secure Scuttlebutt: Running on port 8008')
    tray.on('double-clicked', onopen)

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