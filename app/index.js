logLicense() // per the GPL's recommendation, let ppl know the license

var app  = require('app')
var Menu = require('menu')
var path = require('path')
var http = require('http')
var fs   = require('fs')

var httpStack  = require('./http-server')
var windows    = require('./windows')
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
  .use(require('scuttlebot/plugins/local'))
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

  // setup blob serving
  http.createServer(httpStack.BlobStack(sbot)).listen(7777)

  // open main window
  var mainWindow = windows.open(
    'file://' + path.join(__dirname, '../ui/main.html'),
    sbot,
    { width: 1030, height: 720 }
  )
  require('./menu')(mainWindow)
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

function logLicense () {
  console.log('Patchwork - Copyright (C) 2015 - Secure Scuttlebut Consortium')
  console.log('This program comes with ABSOLUTELY NO WARRANTY.')
  console.log('This is free software, and you are welcome to redistribute it under certain conditions (GPL-3.0).')
  console.log('')
}