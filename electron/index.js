'use strict'
var app = require('electron').app
var windows = require('./windows')
var setupMainMenu = require('./menu')

module.exports = function () {
  // Quit when all windows are closed.
  app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != 'darwin') {
      app.quit()
    }
  })

  app.on('ready', function() {
    var mainWindow = windows.create()
    mainWindow.loadURL('http://localhost:7777')
    setupMainMenu()
  });
}