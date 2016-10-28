'use strict'
var app = require('electron').app
var windows = require('./windows')
var setupMainMenu = require('./menu')

module.exports = function (configOracle) {
  // Quit when all windows are closed.
  app.on('window-all-closed', function() {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform != 'darwin') {
      app.quit()
    }
  })

  app.on('activate', function(ev, hasVisibleWindows) {
    // Only called on macOS. When main window is closed, app goes into
    // background mode. Clicking its dock icon reopens main window.
    if (!hasVisibleWindows) {
      var mainWindow = windows.create()
      mainWindow.loadURL(configOracle.getLocalUrl())
      setupMainMenu(configOracle)
    }
  })

  app.on('ready', function() {
    var mainWindow = windows.create()
    mainWindow.loadURL(configOracle.getLocalUrl())
    setupMainMenu(configOracle)
  })
}
