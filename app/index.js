var app  = require('app')
var Menu = require('menu')
var path = require('path')
var http = require('http')

var menu = require('./lib/menu')
var windows = require('./lib/windows')

app.on('ready', function () {
  // setup servers
  require('./lib/sbot').setup()
  http.createServer(require('./lib/blobs-http-server')()).listen(7777)
  http.createServer(require('./lib/files-http-server')()).listen(7778)

  // open launcher window
  windows.openLauncher()
  // mainWindow.openDevTools()

  // dynamically update main menu on osx
  if (process.platform == 'darwin') {
    app.on('browser-window-focus', function (e, window) {
      Menu.setApplicationMenu(window.menu)
    })
  }
});
