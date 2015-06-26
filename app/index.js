var app = require('app')
var Menu = require('menu')
var path = require('path')

var config = require('ssb-config')
var windows = require('./lib/windows')

// Report crashes to our server.
//require('crash-reporter').start();

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
    var mainWindow = windows.open(
      'file://' + path.join(__dirname, '../node_modules/ssbplug-phoenix/home.html'),
      sbot,
      blobs,
      { width: 1000, height: 720 }
    )
    mainWindow.openDevTools()

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