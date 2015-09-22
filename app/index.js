var app  = require('app')
var Menu = require('menu')
var path = require('path')
var http = require('http')
var fs   = require('fs')

var windows    = require('./lib/windows')
var config     = require('ssb-config/inject')(process.env.ssb_appname)
var ssbKeys    = require('ssb-keys')
var createSbot = require('scuttlebot')
  .use(require('scuttlebot/plugins/master'))
  .use(require('scuttlebot/plugins/gossip'))
  .use(require('scuttlebot/plugins/friends'))
  .use(require('scuttlebot/plugins/replicate'))
  .use(require('scuttlebot/plugins/blobs'))
  .use(require('scuttlebot/plugins/invite'))
  .use(require('scuttlebot/plugins/block'))
  .use(require('scuttlebot/plugins/logging'))
  .use(require('scuttlebot/plugins/private'))
  .use(require('../api'))

config.keys = ssbKeys.loadOrCreateSync(path.join(config.path, 'secret'))
if(config.keys.curve === 'k256')
  throw new Error('k256 curves are no longer supported,'+
                  'please delete' + path.join(config.path, 'secret'))

app.on('ready', function () {
  // start sbot
  var rebuild = false
  var sbot = createSbot(config)

  // write manifest file
  fs.writeFileSync(
    path.join(config.path, 'manifest.json'),
    JSON.stringify(sbot.getManifest(), null, 2)
  )

  // setup blob and file serving
  var blobs = require('./lib/blobs')(sbot, { blobs_dir: path.join(config.path, 'blobs'), checkout_dir: app.getPath('userDesktop') })
  http.createServer(blobs.server({ serveFiles: false })).listen(7777)
  http.createServer(blobs.server({ serveFiles: true })).listen(7778)

  // open main window
  var mainWindow = windows.open(
    'file://' + path.join(__dirname, '../ui/main.html'),
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

});
