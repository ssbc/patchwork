'use strict'

process.on('uncaughtException', function (err) {
  console.log(err)
  process.exit()
})

var electron = require('electron')
var app = electron.app
var windows = require('./windows')
var setupMainMenu = require('./menu')
var Path = require('path')
var t = require('patchwork-translations')
t.setLocale(require('os-locale').sync())

module.exports = function (config) {
  var configOracle = require('../config')(config)
  // Quit when all windows are closed.
  app.on('window-all-closed', function() {
    // the background window will still be open, this will only happen if it crashes
    app.quit()
  })

  app.on('activate', function(ev, hasVisibleWindows) {
    // Only called on macOS. When main window is closed, app goes into
    // background mode. Clicking its dock icon reopens main window.
    if (!hasVisibleWindows) {
      var mainWindow = windows.create()
      mainWindow.loadURL(configOracle.getLocalUrl())
      setupMainMenu(configOracle)
      mainWindow.once('closed', checkShouldExit)
    }
  })

  app.on('ready', function() {
    setupMainMenu(configOracle)
    startBackgroundProcess(function () {
      var mainWindow = windows.create()
      mainWindow.loadURL(configOracle.getLocalUrl())
      mainWindow.once('closed', checkShouldExit)
    })
  })

  function startBackgroundProcess (cb) {
    var backgroundWindow = windows.create({center: true,
      fullscreen: false,
      fullscreenable: false,
      height: 150,
      maximizable: false,
      minimizable: false,
      resizable: false,
      show: false,
      webPreferences: {},
      skipTaskbar: true,
      title: 'ssb-server',
      useContentSize: true,
      width: 150
    })
    electron.ipcMain.once('ready-to-serve', cb)
    backgroundWindow.webContents.on('dom-ready', function () {
      backgroundWindow.webContents.executeJavaScript(`
        var electron = require('electron')
        var server = require('../server-process')
        try {
          server(${JSON.stringify(config)}, function (err) {
            if (err) {
              electron.remote.getGlobal('console').log(err.stack || err)
              throw err
            }
            electron.ipcRenderer.send('ready-to-serve')
          })
        } catch (ex) {
          console.log(ex.stack || ex)
        }
      `)
    })
    backgroundWindow.loadURL(`file://${Path.join(__dirname, 'server-base.html')}`)
  }

  function checkShouldExit () {
    if (process.platform !== 'darwin') {
      process.exit()
    }
  }
}
