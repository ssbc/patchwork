var app  = require('app')
var Menu = require('menu')
var path = require('path')
var http = require('http')

var windows    = require('./lib/windows')

app.on('ready', function () {
  // setup servers
  require('./lib/sbot').setup()
  http.createServer(require('./lib/blobs-http-server')()).listen(7777)

  // open launcher window
  windows.openLauncher()
  require('./lib/menu')()
  // mainWindow.openDevTools()
});
