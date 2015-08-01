var app = require('app')
var Menu = require('menu')
var path = require('path')
var http = require('http')

var config = require('ssb-config')
var windows = require('./lib/windows')

// Report crashes to our server.
//require('crash-reporter').start();

app.on('ready', function ready () {
  // start sbot
  require('scuttlebot').init(config, function (err, sbot) {
    // register sbot plugins
    sbot.use(require('ssb-patchwork-api'))
    
    // setup blob and file serving
    var blobs = require('./lib/blobs')(sbot, app.getPath('userDesktop'))
    require('protocol').registerProtocol('blob', blobs.protocol)
    http.createServer(blobs.server({ serveFiles: false })).listen(7777)
    http.createServer(blobs.server({ serveFiles: true })).listen(7778)

    // open main window
    var mainWindow = windows.open(
      'file://' + path.join(__dirname, '../node_modules/ssb-patchwork-ui/main.html'),
      sbot,
      blobs,
      { width: 1030, height: 720 }
    )
    require('./lib/menu')(mainWindow)
    // mainWindow.openDevTools()

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